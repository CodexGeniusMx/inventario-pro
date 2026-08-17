-- 00017_fix_receive_purchase_immutable_movements.sql
-- Do not UPDATE inventory_movements after insert; receipt items already link via movement_id.

CREATE OR REPLACE FUNCTION receive_purchase(
  p_organization_id uuid,
  p_purchase_order_id uuid,
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
  v_po record;
  v_receipt_id uuid;
  v_document_number text;
  v_line jsonb;
  v_po_item record;
  v_qty_received integer;
  v_unit_cost numeric(12, 2);
  v_remaining integer;
  v_movement_id uuid;
  v_all_received boolean;
  v_new_status purchase_order_status;
  v_existing_receipt_id uuid;
  v_line_count integer := 0;
BEGIN
  PERFORM assert_same_organization(p_organization_id);

  IF NOT has_permission('purchases', 'receive') THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'lines_required';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT pri.purchase_receipt_id
    INTO v_existing_receipt_id
    FROM inventory_movements im
    JOIN purchase_receipt_items pri ON pri.movement_id = im.id
    WHERE im.organization_id = p_organization_id
      AND im.idempotency_key LIKE p_idempotency_key || ':%'
    LIMIT 1;

    IF v_existing_receipt_id IS NOT NULL THEN
      RETURN v_existing_receipt_id;
    END IF;
  END IF;

  SELECT
    po.id,
    po.organization_id,
    po.warehouse_id,
    po.status,
    po.supplier_id
  INTO v_po
  FROM purchase_orders po
  WHERE po.id = p_purchase_order_id
    AND po.organization_id = p_organization_id
  FOR UPDATE;

  IF v_po.id IS NULL THEN
    RAISE EXCEPTION 'purchase_order_not_found';
  END IF;

  IF v_po.status NOT IN ('ordered', 'partially_received') THEN
    RAISE EXCEPTION 'invalid_purchase_status';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM warehouses w
    WHERE w.id = v_po.warehouse_id
      AND w.organization_id = p_organization_id
      AND w.is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_warehouse';
  END IF;

  v_document_number := next_document_number(p_organization_id, 'purchase_receipt');

  INSERT INTO purchase_receipts (
    organization_id,
    purchase_order_id,
    warehouse_id,
    document_number,
    notes,
    created_by
  )
  VALUES (
    p_organization_id,
    p_purchase_order_id,
    v_po.warehouse_id,
    v_document_number,
    p_notes,
    p_created_by
  )
  RETURNING id INTO v_receipt_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_qty_received := (v_line ->> 'quantity_received')::integer;

    IF v_qty_received IS NULL OR v_qty_received <= 0 THEN
      RAISE EXCEPTION 'invalid_line_quantity';
    END IF;

    SELECT
      poi.id,
      poi.product_variant_id,
      poi.quantity_ordered,
      poi.quantity_received,
      poi.unit_cost
    INTO v_po_item
    FROM purchase_order_items poi
    WHERE poi.id = (v_line ->> 'purchase_order_item_id')::uuid
      AND poi.purchase_order_id = p_purchase_order_id
    FOR UPDATE;

    IF v_po_item.id IS NULL THEN
      RAISE EXCEPTION 'invalid_purchase_order_item';
    END IF;

    v_remaining := v_po_item.quantity_ordered - v_po_item.quantity_received;

    IF v_qty_received > v_remaining THEN
      RAISE EXCEPTION 'over_receipt'
        USING DETAIL = format(
          'item %s: remaining=%s, requested=%s',
          v_po_item.id,
          v_remaining,
          v_qty_received
        );
    END IF;

    IF v_line ? 'unit_cost' AND v_line ->> 'unit_cost' IS NOT NULL THEN
      v_unit_cost := (v_line ->> 'unit_cost')::numeric(12, 2);

      IF v_unit_cost IS NULL OR v_unit_cost < 0 THEN
        RAISE EXCEPTION 'invalid_unit_cost';
      END IF;
    ELSE
      v_unit_cost := v_po_item.unit_cost;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = v_po_item.product_variant_id
        AND pv.organization_id = p_organization_id
        AND pv.deleted_at IS NULL
        AND p.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'invalid_line_variant';
    END IF;

    v_movement_id := record_inventory_movement(
      p_organization_id,
      v_po.warehouse_id,
      v_po_item.product_variant_id,
      'purchase_receipt'::movement_type,
      v_qty_received,
      p_created_by,
      v_unit_cost,
      NULL,
      p_notes,
      CASE
        WHEN p_idempotency_key IS NOT NULL THEN
          p_idempotency_key || ':' || v_po_item.id::text
        ELSE NULL
      END,
      NULL,
      NULL,
      v_receipt_id,
      NULL,
      NULL,
      NULL,
      NULL
    );

    IF v_movement_id IS NULL THEN
      RAISE EXCEPTION 'movement_insert_failed';
    END IF;

    INSERT INTO purchase_receipt_items (
      purchase_receipt_id,
      purchase_order_item_id,
      product_variant_id,
      quantity_received,
      unit_cost,
      movement_id
    )
    VALUES (
      v_receipt_id,
      v_po_item.id,
      v_po_item.product_variant_id,
      v_qty_received,
      v_unit_cost,
      v_movement_id
    );

    UPDATE purchase_order_items
    SET quantity_received = quantity_received + v_qty_received
    WHERE id = v_po_item.id;

    v_line_count := v_line_count + 1;
  END LOOP;

  IF v_line_count = 0 THEN
    RAISE EXCEPTION 'lines_required';
  END IF;

  SELECT NOT EXISTS (
    SELECT 1
    FROM purchase_order_items poi
    WHERE poi.purchase_order_id = p_purchase_order_id
      AND poi.quantity_received < poi.quantity_ordered
  )
  INTO v_all_received;

  IF v_all_received THEN
    v_new_status := 'received';
  ELSE
    v_new_status := 'partially_received';
  END IF;

  UPDATE purchase_orders
  SET status = v_new_status,
      updated_at = now()
  WHERE id = p_purchase_order_id;

  RETURN v_receipt_id;
END;
$$;

GRANT EXECUTE ON FUNCTION receive_purchase(
  uuid, uuid, uuid, jsonb, text, text
) TO authenticated;
