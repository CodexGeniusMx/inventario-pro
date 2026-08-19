-- 00031_fix_security_invoker_read_views.sql
--
-- Migration 00030 created permission-aware views WITH (security_invoker = true)
-- after REVOKing SELECT on underlying base tables from authenticated.
-- PostgreSQL requires the invoker to hold SELECT on base tables referenced by
-- security_invoker views, so authenticated clients received SQLSTATE 42501.
--
-- Fix: recreate views as owner-privileged (default) with explicit tenant
-- scoping via get_user_organization_id(). Cost/profit columns remain masked
-- by can_view_product_costs() / can_view_financial_profit() (SECURITY DEFINER).
-- Base-table SELECT stays revoked for authenticated.

-- ---------------------------------------------------------------------------
-- 1. Catalog read views
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_products
AS
SELECT
  p.id,
  p.organization_id,
  p.category_id,
  p.name,
  p.description,
  p.unit_of_measure,
  CASE WHEN can_view_product_costs() THEN p.base_cost_price ELSE NULL END AS base_cost_price,
  p.base_sale_price,
  p.status,
  p.deleted_at,
  p.created_at,
  p.updated_at
FROM products p
WHERE p.organization_id = get_user_organization_id();

CREATE OR REPLACE VIEW v_product_variants
AS
SELECT
  v.id,
  v.organization_id,
  v.product_id,
  v.name,
  v.sku,
  v.barcode,
  CASE WHEN can_view_product_costs() THEN v.cost_price ELSE NULL END AS cost_price,
  v.sale_price,
  v.reorder_point,
  v.is_active,
  v.deleted_at,
  v.created_at,
  v.updated_at
FROM product_variants v
WHERE v.organization_id = get_user_organization_id();

-- ---------------------------------------------------------------------------
-- 2. Purchasing read views
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_purchase_orders
AS
SELECT
  po.id,
  po.organization_id,
  po.supplier_id,
  po.warehouse_id,
  po.document_number,
  po.status,
  po.ordered_at,
  po.notes,
  CASE WHEN can_view_product_costs() THEN po.subtotal ELSE NULL END AS subtotal,
  CASE WHEN can_view_product_costs() THEN po.total ELSE NULL END AS total,
  po.currency_code,
  po.created_by,
  po.created_at,
  po.updated_at,
  po.idempotency_key
FROM purchase_orders po
WHERE po.organization_id = get_user_organization_id();

CREATE OR REPLACE VIEW v_purchase_order_items
AS
SELECT
  poi.id,
  poi.purchase_order_id,
  poi.product_variant_id,
  poi.quantity_ordered,
  poi.quantity_received,
  CASE WHEN can_view_product_costs() THEN poi.unit_cost ELSE NULL END AS unit_cost,
  CASE WHEN can_view_product_costs() THEN poi.line_total ELSE NULL END AS line_total
FROM purchase_order_items poi
JOIN purchase_orders po ON po.id = poi.purchase_order_id
WHERE po.organization_id = get_user_organization_id();

CREATE OR REPLACE VIEW v_purchase_receipt_items
AS
SELECT
  pri.id,
  pri.purchase_receipt_id,
  pri.purchase_order_item_id,
  pri.product_variant_id,
  pri.quantity_received,
  CASE WHEN can_view_product_costs() THEN pri.unit_cost ELSE NULL END AS unit_cost,
  pri.movement_id
FROM purchase_receipt_items pri
JOIN purchase_receipts pr ON pr.id = pri.purchase_receipt_id
WHERE pr.organization_id = get_user_organization_id();

-- ---------------------------------------------------------------------------
-- 3. Inventory read views
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_inventory_valuation
AS
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
  CASE
    WHEN can_view_product_costs()
      THEN resolve_variant_cost_price(v.cost_price, p.base_cost_price)
    ELSE NULL
  END AS unit_cost,
  CASE
    WHEN can_view_product_costs()
      THEN b.quantity_on_hand
        * resolve_variant_cost_price(v.cost_price, p.base_cost_price)
    ELSE NULL
  END AS inventory_value
FROM inventory_balances b
JOIN warehouses w ON w.id = b.warehouse_id
JOIN product_variants v ON v.id = b.product_variant_id
JOIN products p ON p.id = v.product_id
WHERE v.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.status = 'active'::product_status
  AND v.is_active = true
  AND b.organization_id = get_user_organization_id();

CREATE OR REPLACE VIEW v_inventory_status
AS
SELECT
  b.organization_id,
  b.warehouse_id,
  w.name AS warehouse_name,
  b.product_variant_id,
  p.id AS product_id,
  p.name AS product_name,
  v.name AS variant_name,
  v.sku,
  v.barcode,
  b.quantity_on_hand,
  COALESCE(vrp.reorder_point, v.reorder_point) AS reorder_point,
  CASE
    WHEN b.quantity_on_hand = 0 THEN 'out_of_stock'
    WHEN b.quantity_on_hand <= COALESCE(vrp.reorder_point, v.reorder_point)
      THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status,
  b.updated_at,
  resolve_variant_sale_price(v.sale_price, p.base_sale_price) AS sale_price,
  CASE
    WHEN can_view_product_costs()
      THEN resolve_variant_cost_price(v.cost_price, p.base_cost_price)
    ELSE NULL
  END AS cost_price
FROM inventory_balances b
JOIN warehouses w ON w.id = b.warehouse_id
JOIN product_variants v ON v.id = b.product_variant_id
JOIN products p ON p.id = v.product_id
LEFT JOIN variant_reorder_points vrp
  ON vrp.organization_id = b.organization_id
  AND vrp.warehouse_id = b.warehouse_id
  AND vrp.product_variant_id = b.product_variant_id
WHERE v.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.status = 'active'
  AND b.organization_id = get_user_organization_id();

-- ---------------------------------------------------------------------------
-- 4. Ensure authenticated can SELECT permission-aware views (idempotent)
-- ---------------------------------------------------------------------------

GRANT SELECT ON v_products TO authenticated;
GRANT SELECT ON v_product_variants TO authenticated;
GRANT SELECT ON v_purchase_orders TO authenticated;
GRANT SELECT ON v_purchase_order_items TO authenticated;
GRANT SELECT ON v_purchase_receipt_items TO authenticated;
GRANT SELECT ON v_inventory_valuation TO authenticated;
GRANT SELECT ON v_inventory_status TO authenticated;
