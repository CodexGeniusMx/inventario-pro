-- 00023_reporting_views.sql
-- Dashboard and reporting views/functions.

CREATE INDEX IF NOT EXISTS sales_organization_completed_idx
  ON sales (organization_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

CREATE OR REPLACE VIEW v_inventory_valuation AS
SELECT
  b.organization_id,
  b.warehouse_id,
  w.name AS warehouse_name,
  b.product_variant_id,
  p.id AS product_id,
  p.name AS product_name,
  p.status AS product_status,
  v.name AS variant_name,
  v.sku,
  b.quantity_on_hand,
  resolve_variant_cost_price(v.cost_price, p.base_cost_price) AS unit_cost,
  (
    b.quantity_on_hand
    * resolve_variant_cost_price(v.cost_price, p.base_cost_price)
  ) AS inventory_value
FROM inventory_balances b
JOIN warehouses w
  ON w.id = b.warehouse_id
JOIN product_variants v
  ON v.id = b.product_variant_id
JOIN products p
  ON p.id = v.product_id
WHERE v.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.status = 'active'::product_status
  AND v.is_active = true;

CREATE OR REPLACE VIEW v_completed_sale_lines AS
SELECT
  s.organization_id,
  s.id AS sale_id,
  s.document_number,
  s.warehouse_id,
  s.customer_id,
  s.status,
  s.discount_amount AS sale_discount_amount,
  s.completed_at,
  si.id AS sale_item_id,
  si.product_variant_id,
  p.id AS product_id,
  p.name AS product_name,
  v.name AS variant_name,
  v.sku,
  si.quantity,
  si.quantity_returned,
  si.quantity - si.quantity_returned AS net_quantity,
  si.unit_price,
  si.discount_amount AS line_discount_amount,
  si.line_total,
  (
    (si.quantity - si.quantity_returned)::numeric
    / si.quantity::numeric
  ) * si.line_total AS net_revenue,
  si.quantity_returned * si.unit_price AS returned_revenue_estimate,
  (
    (si.quantity - si.quantity_returned)
    * resolve_variant_cost_price(v.cost_price, p.base_cost_price)
  ) AS estimated_cogs
FROM sales s
JOIN sale_items si
  ON si.sale_id = s.id
JOIN product_variants v
  ON v.id = si.product_variant_id
JOIN products p
  ON p.id = v.product_id
WHERE s.status IN ('completed', 'partially_returned', 'fully_returned')
  AND s.completed_at IS NOT NULL
  AND v.deleted_at IS NULL
  AND p.deleted_at IS NULL;

CREATE OR REPLACE FUNCTION report_sales_summary(
  p_organization_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  sales_count bigint,
  units_sold bigint,
  return_units bigint,
  gross_revenue numeric,
  net_revenue numeric,
  discount_total numeric,
  return_revenue numeric,
  estimated_cogs numeric,
  estimated_gross_profit numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  PERFORM assert_same_organization(p_organization_id);

  IF NOT has_permission('reports', 'read') THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  RETURN QUERY
  WITH scoped_sales AS (
    SELECT s.id, s.discount_amount
    FROM sales s
    WHERE s.organization_id = p_organization_id
      AND s.status IN ('completed', 'partially_returned', 'fully_returned')
      AND s.completed_at >= p_from
      AND s.completed_at < p_to
  ),
  scoped_lines AS (
    SELECT l.*
    FROM v_completed_sale_lines l
    JOIN scoped_sales ss ON ss.id = l.sale_id
    WHERE l.organization_id = p_organization_id
      AND l.completed_at >= p_from
      AND l.completed_at < p_to
  )
  SELECT
    (SELECT COUNT(*)::bigint FROM scoped_sales),
    COALESCE((SELECT SUM(net_quantity)::bigint FROM scoped_lines), 0),
    COALESCE((SELECT SUM(quantity_returned)::bigint FROM scoped_lines), 0),
    COALESCE((SELECT SUM(line_total) FROM scoped_lines), 0),
    COALESCE((SELECT SUM(net_revenue) FROM scoped_lines), 0),
    COALESCE((SELECT SUM(sale_discount_amount) FROM scoped_sales), 0),
    COALESCE((SELECT SUM(returned_revenue_estimate) FROM scoped_lines), 0),
    COALESCE((SELECT SUM(estimated_cogs) FROM scoped_lines), 0),
    COALESCE((SELECT SUM(net_revenue - estimated_cogs) FROM scoped_lines), 0);
END;
$$;

CREATE OR REPLACE FUNCTION report_sales_by_day(
  p_organization_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  day date,
  sales_count bigint,
  net_revenue numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  PERFORM assert_same_organization(p_organization_id);

  IF NOT has_permission('reports', 'read') THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  RETURN QUERY
  SELECT
    (s.completed_at AT TIME ZONE 'UTC')::date AS day,
    COUNT(DISTINCT s.id)::bigint AS sales_count,
    COALESCE(SUM(l.net_revenue), 0) AS net_revenue
  FROM sales s
  JOIN v_completed_sale_lines l
    ON l.sale_id = s.id
  WHERE s.organization_id = p_organization_id
    AND s.status IN ('completed', 'partially_returned', 'fully_returned')
    AND s.completed_at >= p_from
    AND s.completed_at < p_to
  GROUP BY 1
  ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION report_top_products(
  p_organization_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  product_variant_id uuid,
  product_name text,
  variant_name text,
  sku text,
  units_sold bigint,
  net_revenue numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  PERFORM assert_same_organization(p_organization_id);

  IF NOT has_permission('reports', 'read') THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  RETURN QUERY
  SELECT
    l.product_variant_id,
    l.product_name,
    l.variant_name,
    l.sku,
    SUM(l.net_quantity)::bigint AS units_sold,
    COALESCE(SUM(l.net_revenue), 0) AS net_revenue
  FROM v_completed_sale_lines l
  WHERE l.organization_id = p_organization_id
    AND l.completed_at >= p_from
    AND l.completed_at < p_to
  GROUP BY
    l.product_variant_id,
    l.product_name,
    l.variant_name,
    l.sku
  ORDER BY units_sold DESC, net_revenue DESC
  LIMIT GREATEST(p_limit, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION report_sales_summary(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION report_sales_by_day(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION report_top_products(uuid, timestamptz, timestamptz, integer) TO authenticated;
