-- 00004_parties_and_warehouses.sql
-- Suppliers, customers, warehouses, per-warehouse reorder points

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  tax_id text,
  payment_terms text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_name_not_empty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX suppliers_organization_id_idx ON suppliers (organization_id);
CREATE INDEX suppliers_organization_name_idx ON suppliers (organization_id, name);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  email text,
  phone text,
  tax_id text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_name_not_empty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX customers_organization_id_idx ON customers (organization_id);
CREATE INDEX customers_organization_name_idx ON customers (organization_id, name);

CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  branch_id uuid REFERENCES branches (id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL,
  address text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT warehouses_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT warehouses_code_not_empty CHECK (char_length(trim(code)) > 0)
);

CREATE UNIQUE INDEX warehouses_organization_code_key ON warehouses (organization_id, code);
CREATE UNIQUE INDEX warehouses_one_default_per_org_idx
  ON warehouses (organization_id)
  WHERE is_default = true;

CREATE INDEX warehouses_organization_id_idx ON warehouses (organization_id);
CREATE INDEX warehouses_branch_id_idx ON warehouses (branch_id);

CREATE TABLE variant_reorder_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  product_variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  reorder_point integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT variant_reorder_points_nonneg CHECK (reorder_point >= 0)
);

CREATE UNIQUE INDEX variant_reorder_points_warehouse_variant_key
  ON variant_reorder_points (warehouse_id, product_variant_id);

CREATE INDEX variant_reorder_points_organization_id_idx
  ON variant_reorder_points (organization_id);

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_variant_reorder_points_updated_at
  BEFORE UPDATE ON variant_reorder_points
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
