-- 00025_fix_report_sales_summary.sql
-- Fix PL/pgSQL ambiguous column references in sales reporting RPCs.
-- Also bucket sales-by-day using the organization's timezone.

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
    COALESCE((SELECT SUM(sl.net_quantity)::bigint FROM scoped_lines sl), 0),
    COALESCE((SELECT SUM(sl.quantity_returned)::bigint FROM scoped_lines sl), 0),
    COALESCE((SELECT SUM(sl.line_total) FROM scoped_lines sl), 0),
    COALESCE((SELECT SUM(sl.net_revenue) FROM scoped_lines sl), 0),
    COALESCE((SELECT SUM(ss.discount_amount) FROM scoped_sales ss), 0),
    COALESCE((SELECT SUM(sl.returned_revenue_estimate) FROM scoped_lines sl), 0),
    COALESCE((SELECT SUM(sl.estimated_cogs) FROM scoped_lines sl), 0),
    COALESCE((SELECT SUM(sl.net_revenue - sl.estimated_cogs) FROM scoped_lines sl), 0);
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
DECLARE
  v_timezone text;
BEGIN
  PERFORM assert_same_organization(p_organization_id);

  IF NOT has_permission('reports', 'read') THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  SELECT o.timezone
  INTO v_timezone
  FROM organizations o
  WHERE o.id = p_organization_id;

  IF v_timezone IS NULL OR btrim(v_timezone) = '' THEN
    v_timezone := 'UTC';
  END IF;

  RETURN QUERY
  SELECT
    (s.completed_at AT TIME ZONE v_timezone)::date AS day,
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

GRANT EXECUTE ON FUNCTION report_sales_summary(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION report_sales_by_day(uuid, timestamptz, timestamptz) TO authenticated;
