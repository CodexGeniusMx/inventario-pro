-- Catalog QA hardening: NULL-only variant price inheritance, units catalog, inventory view prices.

-- NULL = inherit; zero remains a valid explicit override.
CREATE OR REPLACE FUNCTION resolve_variant_sale_price(
  p_variant_sale_price numeric,
  p_base_sale_price numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_variant_sale_price, p_base_sale_price);
$$;

CREATE OR REPLACE FUNCTION resolve_variant_cost_price(
  p_variant_cost_price numeric,
  p_base_cost_price numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_variant_cost_price, p_base_cost_price);
$$;

-- Development rows that stored UI default 0 as "inherit" when product base is non-zero.
UPDATE product_variants pv
SET cost_price = NULL
FROM products p
WHERE p.id = pv.product_id
  AND pv.cost_price = 0
  AND p.base_cost_price <> 0;

UPDATE product_variants pv
SET sale_price = NULL
FROM products p
WHERE p.id = pv.product_id
  AND pv.sale_price = 0
  AND p.base_sale_price <> 0;

CREATE TABLE IF NOT EXISTS organization_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  code text NOT NULL,
  label text NOT NULL,
  normalized_key text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_units_code_not_empty CHECK (length(trim(code)) > 0),
  CONSTRAINT organization_units_label_not_empty CHECK (length(trim(label)) > 0),
  CONSTRAINT organization_units_normalized_key_not_empty CHECK (length(trim(normalized_key)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_units_org_normalized_key_idx
  ON organization_units (organization_id, normalized_key);

CREATE INDEX IF NOT EXISTS organization_units_org_active_idx
  ON organization_units (organization_id)
  WHERE is_active = true;

CREATE TRIGGER organization_units_set_updated_at
  BEFORE UPDATE ON organization_units
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE organization_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_units_select_org
  ON organization_units FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS organization_units_admin_write ON organization_units;

INSERT INTO organization_units (organization_id, code, label, normalized_key, is_system)
SELECT o.id, seed.code, seed.label, seed.normalized_key, true
FROM organizations o
CROSS JOIN (
  VALUES
    ('unit', 'Unidad', 'unit'),
    ('piece', 'Pieza', 'piece'),
    ('box', 'Caja', 'box'),
    ('pack', 'Paquete', 'pack'),
    ('pair', 'Par', 'pair'),
    ('dozen', 'Docena', 'dozen'),
    ('kg', 'Kilogramo', 'kilogramo'),
    ('g', 'Gramo', 'gramo'),
    ('l', 'Litro', 'litro'),
    ('ml', 'Mililitro', 'mililitro'),
    ('m', 'Metro', 'metro'),
    ('roll', 'Rollo', 'rollo')
) AS seed(code, label, normalized_key)
WHERE NOT EXISTS (
  SELECT 1
  FROM organization_units existing
  WHERE existing.organization_id = o.id
    AND existing.normalized_key = seed.normalized_key
);

DROP POLICY IF EXISTS organization_units_admin_write ON organization_units;

CREATE POLICY organization_units_manage
  ON organization_units FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND (
      is_org_admin()
      OR has_permission('categories', 'write')
      OR has_permission('products', 'edit')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND (
      is_org_admin()
      OR has_permission('categories', 'write')
      OR has_permission('products', 'edit')
    )
  );

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
  b.updated_at,
  resolve_variant_sale_price(v.sale_price, p.base_sale_price) AS sale_price,
  resolve_variant_cost_price(v.cost_price, p.base_cost_price) AS cost_price
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
  AND p.deleted_at IS NULL
  AND p.status = 'active';

-- Prior archive implementation incorrectly set deleted_at; preserve history with status only.
UPDATE products
SET deleted_at = NULL
WHERE deleted_at IS NOT NULL
  AND status IN ('active', 'archived');
