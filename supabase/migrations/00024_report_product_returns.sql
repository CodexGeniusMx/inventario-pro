-- 00024_report_product_returns.sql
-- Extend product performance reporting with return metrics.

DROP FUNCTION IF EXISTS report_top_products(uuid, timestamptz, timestamptz, integer);

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
  return_units bigint,
  net_revenue numeric,
  return_revenue numeric
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
    SUM(l.quantity_returned)::bigint AS return_units,
    COALESCE(SUM(l.net_revenue), 0) AS net_revenue,
    COALESCE(SUM(l.returned_revenue_estimate), 0) AS return_revenue
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

GRANT EXECUTE ON FUNCTION report_top_products(uuid, timestamptz, timestamptz, integer) TO authenticated;
