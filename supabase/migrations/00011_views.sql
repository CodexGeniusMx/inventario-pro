-- 00011_views.sql
-- Reporting and inventory views

-- 00011_views.sql
-- Reporting and inventory views

CREATE OR REPLACE VIEW v_inventory_status AS
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
  b.updated_at
FROM inventory_balances b
JOIN warehouses w
  ON w.id = b.warehouse_id
JOIN product_variants v
  ON v.id = b.product_variant_id
JOIN products p
  ON p.id = v.product_id
LEFT JOIN variant_reorder_points vrp
  ON vrp.organization_id = b.organization_id
  AND vrp.warehouse_id = b.warehouse_id
  AND vrp.product_variant_id = b.product_variant_id
WHERE v.deleted_at IS NULL
  AND p.deleted_at IS NULL;


CREATE OR REPLACE VIEW v_low_stock_items AS
SELECT *
FROM v_inventory_status
WHERE stock_status IN ('low_stock', 'out_of_stock');


CREATE OR REPLACE VIEW v_inventory_reconciliation AS
SELECT
  b.organization_id,
  b.warehouse_id,
  b.product_variant_id,
  b.quantity_on_hand AS balance_quantity,
  COALESCE(SUM(m.quantity), 0)::integer AS movement_sum,
  b.quantity_on_hand - COALESCE(SUM(m.quantity), 0)::integer AS discrepancy
FROM inventory_balances b
LEFT JOIN inventory_movements m
  ON m.organization_id = b.organization_id
  AND m.warehouse_id = b.warehouse_id
  AND m.product_variant_id = b.product_variant_id
GROUP BY
  b.organization_id,
  b.warehouse_id,
  b.product_variant_id,
  b.quantity_on_hand;