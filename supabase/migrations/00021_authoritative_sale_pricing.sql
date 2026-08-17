-- 00021_authoritative_sale_pricing.sql
-- Authoritative sale pricing: ignore variant prices of 0/null; fall back to product base prices.
-- Rejects zero-price lines when the product has a positive base sale price.

CREATE OR REPLACE FUNCTION resolve_variant_sale_price(
  p_variant_sale_price numeric,
  p_base_sale_price numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(NULLIF(p_variant_sale_price, 0), p_base_sale_price);
$$;

CREATE OR REPLACE FUNCTION resolve_variant_cost_price(
  p_variant_cost_price numeric,
  p_base_cost_price numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(NULLIF(p_variant_cost_price, 0), p_base_cost_price);
$$;

CREATE OR REPLACE FUNCTION create_and_complete_sale(
  p_organization_id uuid,
  p_warehouse_id uuid,
  p_created_by uuid,
  p_lines jsonb,
  p_customer_id uuid DEFAULT NULL,
  p_discount_amount numeric DEFAULT 0,
  p_idempotency_key text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_sale_id uuid;
  v_document_number text;
  v_line jsonb;
  v_variant_id uuid;
  v_quantity integer;
  v_unit_price numeric(12, 2);
  v_base_sale_price numeric(12, 2);
  v_line_total numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_total numeric(12, 2);
  v_item_id uuid;
  v_movement_id uuid;
  v_line_count integer := 0;
  v_existing_sale_id uuid;
BEGIN
  PERFORM assert_same_organization(p_organization_id);

  IF NOT has_permission('sales', 'complete') THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'lines_required';
  END IF;

  IF p_discount_amount IS NULL OR p_discount_amount < 0 THEN
    RAISE EXCEPTION 'invalid_discount_amount';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT im.sale_id
    INTO v_existing_sale_id
    FROM inventory_movements im
    WHERE im.organization_id = p_organization_id
      AND im.idempotency_key LIKE p_idempotency_key || ':%'
    LIMIT 1;

    IF v_existing_sale_id IS NOT NULL THEN
      RETURN v_existing_sale_id;
    END IF;
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

  IF p_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM customers c
    WHERE c.id = p_customer_id
      AND c.organization_id = p_organization_id
      AND c.deleted_at IS NULL
      AND c.is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_customer';
  END IF;

  v_document_number := next_document_number(p_organization_id, 'sale');

  INSERT INTO sales (
    organization_id,
    warehouse_id,
    customer_id,
    document_number,
    status,
    subtotal,
    discount_amount,
    total,
    notes,
    created_by
  )
  VALUES (
    p_organization_id,
    p_warehouse_id,
    p_customer_id,
    v_document_number,
    'draft',
    0,
    p_discount_amount,
    0,
    NULLIF(trim(p_notes), ''),
    p_created_by
  )
  RETURNING id INTO v_sale_id;

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

    SELECT
      resolve_variant_sale_price(pv.sale_price, p.base_sale_price),
      p.base_sale_price
    INTO v_unit_price, v_base_sale_price
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.id = v_variant_id
      AND pv.organization_id = p_organization_id
      AND pv.deleted_at IS NULL
      AND pv.is_active = true
      AND p.deleted_at IS NULL
      AND p.status = 'active';

    IF v_unit_price IS NULL THEN
      RAISE EXCEPTION 'invalid_line_variant';
    END IF;

    IF v_unit_price <= 0 AND v_base_sale_price > 0 THEN
      RAISE EXCEPTION 'invalid_line_price';
    END IF;

    v_line_total := round(v_unit_price * v_quantity, 2);
    v_subtotal := v_subtotal + v_line_total;

    INSERT INTO sale_items (
      sale_id,
      product_variant_id,
      quantity,
      unit_price,
      discount_amount,
      line_total
    )
    VALUES (
      v_sale_id,
      v_variant_id,
      v_quantity,
      v_unit_price,
      0,
      v_line_total
    )
    RETURNING id INTO v_item_id;

    v_movement_id := record_inventory_movement(
      p_organization_id,
      p_warehouse_id,
      v_variant_id,
      'sale'::movement_type,
      -v_quantity,
      p_created_by,
      NULL,
      NULL,
      NULL,
      CASE
        WHEN p_idempotency_key IS NOT NULL THEN
          p_idempotency_key || ':' || v_item_id::text
        ELSE NULL
      END,
      v_sale_id,
      v_item_id,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL
    );

    IF v_movement_id IS NULL THEN
      RAISE EXCEPTION 'movement_insert_failed';
    END IF;

    UPDATE sale_items
    SET movement_id = v_movement_id
    WHERE id = v_item_id;

    v_line_count := v_line_count + 1;
  END LOOP;

  IF v_line_count = 0 THEN
    RAISE EXCEPTION 'lines_required';
  END IF;

  v_total := GREATEST(v_subtotal - p_discount_amount, 0);

  UPDATE sales
  SET status = 'completed',
      subtotal = v_subtotal,
      total = v_total,
      discount_amount = p_discount_amount,
      completed_at = now(),
      updated_at = now()
  WHERE id = v_sale_id;

  RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_variant_sale_price(numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_variant_cost_price(numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION create_and_complete_sale(
  uuid, uuid, uuid, jsonb, uuid, numeric, text, text
) TO authenticated;
