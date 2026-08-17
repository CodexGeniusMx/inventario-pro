-- 00022_process_return.sql
-- Customer sale returns: atomic return document + inventory movements + sale status updates.

ALTER TABLE returns
  ADD COLUMN IF NOT EXISTS reason text;

ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_quantity_nonzero;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_quantity_nonzero CHECK (
    quantity <> 0
    OR (
      return_id IS NOT NULL
      AND return_item_id IS NOT NULL
      AND movement_type = 'damage'::movement_type
    )
  );

CREATE OR REPLACE FUNCTION process_return(
  p_organization_id uuid,
  p_sale_id uuid,
  p_created_by uuid,
  p_lines jsonb,
  p_reason text,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_return_id uuid;
  v_document_number text;
  v_sale_warehouse_id uuid;
  v_sale_status sale_status;
  v_line jsonb;
  v_sale_item_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_is_restockable boolean;
  v_return_item_id uuid;
  v_movement_id uuid;
  v_sold_quantity integer;
  v_returned_quantity integer;
  v_returnable_quantity integer;
  v_before integer;
  v_balance_id uuid;
  v_line_count integer := 0;
  v_existing_return_id uuid;
  v_all_returned boolean;
BEGIN
  PERFORM assert_same_organization(p_organization_id);

  IF NOT has_permission('returns', 'write') THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'lines_required';
  END IF;

  IF p_reason IS NULL OR char_length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT s.warehouse_id, s.status
  INTO v_sale_warehouse_id, v_sale_status
  FROM sales s
  WHERE s.id = p_sale_id
    AND s.organization_id = p_organization_id
  FOR UPDATE;

  IF v_sale_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'invalid_sale';
  END IF;

  IF v_sale_status NOT IN ('completed', 'partially_returned') THEN
    RAISE EXCEPTION 'invalid_sale_status';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM warehouses w
    WHERE w.id = v_sale_warehouse_id
      AND w.organization_id = p_organization_id
      AND w.is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_warehouse';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT im.return_id
    INTO v_existing_return_id
    FROM inventory_movements im
    WHERE im.organization_id = p_organization_id
      AND im.idempotency_key LIKE p_idempotency_key || ':%'
      AND im.return_id IS NOT NULL
    LIMIT 1;

    IF v_existing_return_id IS NOT NULL THEN
      RETURN v_existing_return_id;
    END IF;
  END IF;

  v_document_number := next_document_number(p_organization_id, 'return');

  INSERT INTO returns (
    organization_id,
    sale_id,
    warehouse_id,
    document_number,
    reason,
    notes,
    created_by
  )
  VALUES (
    p_organization_id,
    p_sale_id,
    v_sale_warehouse_id,
    v_document_number,
    trim(p_reason),
    NULLIF(trim(p_notes), ''),
    p_created_by
  )
  RETURNING id INTO v_return_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_sale_item_id := (v_line ->> 'sale_item_id')::uuid;
    v_quantity := (v_line ->> 'quantity')::integer;
    v_is_restockable := COALESCE((v_line ->> 'is_restockable')::boolean, true);

    IF v_sale_item_id IS NULL THEN
      RAISE EXCEPTION 'invalid_line_item';
    END IF;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'invalid_line_quantity';
    END IF;

    SELECT
      si.product_variant_id,
      si.quantity,
      si.quantity_returned
    INTO v_variant_id, v_sold_quantity, v_returned_quantity
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE si.id = v_sale_item_id
      AND si.sale_id = p_sale_id
      AND s.organization_id = p_organization_id
    FOR UPDATE OF si;

    IF v_variant_id IS NULL THEN
      RAISE EXCEPTION 'invalid_line_item';
    END IF;

    v_returnable_quantity := v_sold_quantity - v_returned_quantity;

    IF v_quantity > v_returnable_quantity THEN
      RAISE EXCEPTION 'excess_return_quantity';
    END IF;

    INSERT INTO return_items (
      return_id,
      sale_item_id,
      product_variant_id,
      quantity,
      is_restockable
    )
    VALUES (
      v_return_id,
      v_sale_item_id,
      v_variant_id,
      v_quantity,
      v_is_restockable
    )
    RETURNING id INTO v_return_item_id;

    IF v_is_restockable THEN
      v_movement_id := record_inventory_movement(
        p_organization_id,
        v_sale_warehouse_id,
        v_variant_id,
        'sale_return'::movement_type,
        v_quantity,
        p_created_by,
        NULL,
        trim(p_reason),
        NULLIF(trim(p_notes), ''),
        CASE
          WHEN p_idempotency_key IS NOT NULL THEN
            p_idempotency_key || ':' || v_return_item_id::text
          ELSE NULL
        END,
        p_sale_id,
        v_sale_item_id,
        NULL,
        NULL,
        NULL,
        v_return_id,
        v_return_item_id
      );

      UPDATE return_items
      SET restock_movement_id = v_movement_id
      WHERE id = v_return_item_id;
    ELSE
      INSERT INTO inventory_balances (
        organization_id,
        warehouse_id,
        product_variant_id,
        quantity_on_hand
      )
      VALUES (
        p_organization_id,
        v_sale_warehouse_id,
        v_variant_id,
        0
      )
      ON CONFLICT (warehouse_id, product_variant_id) DO NOTHING;

      SELECT id, quantity_on_hand
      INTO v_balance_id, v_before
      FROM inventory_balances
      WHERE warehouse_id = v_sale_warehouse_id
        AND product_variant_id = v_variant_id
      FOR UPDATE;

      IF v_balance_id IS NULL THEN
        RAISE EXCEPTION 'balance_row_missing';
      END IF;

      INSERT INTO inventory_movements (
        organization_id,
        warehouse_id,
        product_variant_id,
        movement_type,
        quantity,
        quantity_before,
        quantity_after,
        reason,
        notes,
        sale_id,
        sale_item_id,
        return_id,
        return_item_id,
        idempotency_key,
        created_by
      )
      VALUES (
        p_organization_id,
        v_sale_warehouse_id,
        v_variant_id,
        'damage'::movement_type,
        0,
        v_before,
        v_before,
        trim(p_reason),
        NULLIF(trim(p_notes), ''),
        p_sale_id,
        v_sale_item_id,
        v_return_id,
        v_return_item_id,
        CASE
          WHEN p_idempotency_key IS NOT NULL THEN
            p_idempotency_key || ':' || v_return_item_id::text
          ELSE NULL
        END,
        p_created_by
      )
      RETURNING id INTO v_movement_id;

      UPDATE return_items
      SET damage_movement_id = v_movement_id
      WHERE id = v_return_item_id;
    END IF;

    UPDATE sale_items
    SET quantity_returned = quantity_returned + v_quantity
    WHERE id = v_sale_item_id;

    v_line_count := v_line_count + 1;
  END LOOP;

  IF v_line_count = 0 THEN
    RAISE EXCEPTION 'lines_required';
  END IF;

  SELECT NOT EXISTS (
    SELECT 1
    FROM sale_items si
    WHERE si.sale_id = p_sale_id
      AND si.quantity_returned < si.quantity
  )
  INTO v_all_returned;

  UPDATE sales
  SET status = CASE
        WHEN v_all_returned THEN 'fully_returned'::sale_status
        ELSE 'partially_returned'::sale_status
      END,
      updated_at = now()
  WHERE id = p_sale_id;

  RETURN v_return_id;
END;
$$;

GRANT EXECUTE ON FUNCTION process_return(
  uuid, uuid, uuid, jsonb, text, text, text
) TO authenticated;
