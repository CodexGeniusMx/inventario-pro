-- 00015_fix_inventory_rpc_row_security.sql
-- Ensure inventory RPCs atomically write movements + balances under RLS.

CREATE OR REPLACE FUNCTION record_inventory_movement(
  p_organization_id uuid,
  p_warehouse_id uuid,
  p_product_variant_id uuid,
  p_movement_type movement_type,
  p_quantity integer,
  p_created_by uuid,
  p_unit_cost numeric DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_sale_id uuid DEFAULT NULL,
  p_sale_item_id uuid DEFAULT NULL,
  p_purchase_receipt_id uuid DEFAULT NULL,
  p_purchase_receipt_item_id uuid DEFAULT NULL,
  p_stock_adjustment_id uuid DEFAULT NULL,
  p_return_id uuid DEFAULT NULL,
  p_return_item_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_existing_id uuid;
  v_before integer;
  v_after integer;
  v_balance_id uuid;
  v_movement_id uuid;
BEGIN
  IF p_quantity = 0 THEN
    RAISE EXCEPTION 'quantity must be non-zero';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM inventory_movements
    WHERE organization_id = p_organization_id
      AND idempotency_key = p_idempotency_key;

    IF v_existing_id IS NOT NULL THEN
      IF p_stock_adjustment_id IS NOT NULL THEN
        IF EXISTS (
          SELECT 1
          FROM inventory_movements
          WHERE id = v_existing_id
            AND stock_adjustment_id = p_stock_adjustment_id
        ) THEN
          RETURN v_existing_id;
        END IF;

        RAISE EXCEPTION 'idempotency_conflict';
      END IF;

      RETURN v_existing_id;
    END IF;
  END IF;

  INSERT INTO inventory_balances (
    organization_id,
    warehouse_id,
    product_variant_id,
    quantity_on_hand
  )
  VALUES (
    p_organization_id,
    p_warehouse_id,
    p_product_variant_id,
    0
  )
  ON CONFLICT (warehouse_id, product_variant_id) DO NOTHING;

  SELECT id, quantity_on_hand
  INTO v_balance_id, v_before
  FROM inventory_balances
  WHERE warehouse_id = p_warehouse_id
    AND product_variant_id = p_product_variant_id
  FOR UPDATE;

  IF v_balance_id IS NULL THEN
    RAISE EXCEPTION 'balance_row_missing';
  END IF;

  v_after := v_before + p_quantity;

  IF v_after < 0 THEN
    RAISE EXCEPTION 'insufficient_stock'
      USING ERRCODE = 'check_violation',
            DETAIL = format(
              'variant %s in warehouse %s: before=%s, change=%s',
              p_product_variant_id,
              p_warehouse_id,
              v_before,
              p_quantity
            );
  END IF;

  INSERT INTO inventory_movements (
    organization_id,
    warehouse_id,
    product_variant_id,
    movement_type,
    quantity,
    quantity_before,
    quantity_after,
    unit_cost,
    reason,
    notes,
    sale_id,
    sale_item_id,
    purchase_receipt_id,
    purchase_receipt_item_id,
    stock_adjustment_id,
    return_id,
    return_item_id,
    idempotency_key,
    created_by
  )
  VALUES (
    p_organization_id,
    p_warehouse_id,
    p_product_variant_id,
    p_movement_type,
    p_quantity,
    v_before,
    v_after,
    p_unit_cost,
    p_reason,
    p_notes,
    p_sale_id,
    p_sale_item_id,
    p_purchase_receipt_id,
    p_purchase_receipt_item_id,
    p_stock_adjustment_id,
    p_return_id,
    p_return_item_id,
    p_idempotency_key,
    p_created_by
  )
  RETURNING id INTO v_movement_id;

  IF v_movement_id IS NULL THEN
    RAISE EXCEPTION 'movement_insert_failed';
  END IF;

  UPDATE inventory_balances
  SET quantity_on_hand = v_after,
      updated_at = now()
  WHERE id = v_balance_id;

  RETURN v_movement_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_stock_adjustment(
  p_organization_id uuid,
  p_warehouse_id uuid,
  p_adjustment_type stock_adjustment_type,
  p_reason text,
  p_created_by uuid,
  p_lines jsonb,
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
  v_adjustment_id uuid;
  v_document_number text;
  v_line jsonb;
  v_variant_id uuid;
  v_quantity integer;
  v_signed_quantity integer;
  v_movement_type movement_type;
  v_movement_id uuid;
  v_item_id uuid;
  v_line_count integer := 0;
BEGIN
  PERFORM assert_same_organization(p_organization_id);

  IF NOT has_permission('inventory', 'adjust') THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF char_length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'lines_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM warehouses w
    WHERE w.id = p_warehouse_id
      AND w.organization_id = p_organization_id
      AND w.is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_warehouse';
  END IF;

  v_document_number := next_document_number(p_organization_id, 'stock_adjustment');

  INSERT INTO stock_adjustments (
    organization_id,
    warehouse_id,
    document_number,
    adjustment_type,
    reason,
    notes,
    created_by
  )
  VALUES (
    p_organization_id,
    p_warehouse_id,
    v_document_number,
    p_adjustment_type,
    p_reason,
    p_notes,
    p_created_by
  )
  RETURNING id INTO v_adjustment_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_variant_id := (v_line ->> 'product_variant_id')::uuid;
    v_quantity := (v_line ->> 'quantity')::integer;

    IF v_variant_id IS NULL THEN
      RAISE EXCEPTION 'invalid_line_variant';
    END IF;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'invalid_line_quantity';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = v_variant_id
        AND pv.organization_id = p_organization_id
        AND pv.deleted_at IS NULL
        AND pv.is_active = true
        AND p.deleted_at IS NULL
        AND p.status = 'active'
    ) THEN
      RAISE EXCEPTION 'invalid_line_variant';
    END IF;

    v_movement_type := map_adjustment_type_to_movement(p_adjustment_type, true);

    IF p_adjustment_type IN ('decrease', 'damage', 'loss') THEN
      v_signed_quantity := -v_quantity;
    ELSE
      v_signed_quantity := v_quantity;
    END IF;

    v_movement_id := record_inventory_movement(
      p_organization_id,
      p_warehouse_id,
      v_variant_id,
      v_movement_type,
      v_signed_quantity,
      p_created_by,
      NULL,
      p_reason,
      p_notes,
      CASE
        WHEN p_idempotency_key IS NOT NULL THEN
          p_idempotency_key || ':' || v_variant_id::text
        ELSE NULL
      END,
      NULL,
      NULL,
      NULL,
      NULL,
      v_adjustment_id,
      NULL,
      NULL
    );

    IF v_movement_id IS NULL THEN
      RAISE EXCEPTION 'movement_insert_failed';
    END IF;

    INSERT INTO stock_adjustment_items (
      stock_adjustment_id,
      product_variant_id,
      quantity,
      movement_id
    )
    VALUES (
      v_adjustment_id,
      v_variant_id,
      v_quantity,
      v_movement_id
    )
    RETURNING id INTO v_item_id;

    v_line_count := v_line_count + 1;
  END LOOP;

  IF v_line_count = 0 THEN
    RAISE EXCEPTION 'lines_required';
  END IF;

  RETURN v_adjustment_id;
END;
$$;

CREATE OR REPLACE FUNCTION assert_same_organization(
  p_organization_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF get_user_organization_id() IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'organization_mismatch';
  END IF;

  IF NOT is_active_user() THEN
    RAISE EXCEPTION 'inactive_user';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION next_document_number(
  p_organization_id uuid,
  p_document_kind document_kind
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_next bigint;
  v_prefix text;
BEGIN
  INSERT INTO document_sequences (organization_id, document_kind, last_value)
  VALUES (p_organization_id, p_document_kind, 0)
  ON CONFLICT (organization_id, document_kind) DO NOTHING;

  UPDATE document_sequences
  SET last_value = last_value + 1
  WHERE organization_id = p_organization_id
    AND document_kind = p_document_kind
  RETURNING last_value INTO v_next;

  v_prefix := CASE p_document_kind
    WHEN 'sale' THEN 'S-'
    WHEN 'purchase_order' THEN 'PO-'
    WHEN 'purchase_receipt' THEN 'PR-'
    WHEN 'return' THEN 'R-'
    WHEN 'stock_adjustment' THEN 'ADJ-'
  END;

  RETURN v_prefix || lpad(v_next::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION record_inventory_movement(
  uuid, uuid, uuid, movement_type, integer, uuid,
  numeric, text, text, text,
  uuid, uuid, uuid, uuid, uuid, uuid, uuid
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_stock_adjustment(
  uuid, uuid, stock_adjustment_type, text, uuid, jsonb, text, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION next_document_number(uuid, document_kind) TO authenticated;
