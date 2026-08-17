-- 00003_catalog.sql
-- Categories, products, product variants

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  parent_id uuid REFERENCES categories (id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT categories_slug_not_empty CHECK (char_length(trim(slug)) > 0)
);

CREATE UNIQUE INDEX categories_organization_slug_active_key
  ON categories (organization_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX categories_organization_id_idx ON categories (organization_id);
CREATE INDEX categories_parent_id_idx ON categories (parent_id);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  category_id uuid REFERENCES categories (id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  unit_of_measure text NOT NULL DEFAULT 'unit',
  base_cost_price numeric(12, 2) NOT NULL DEFAULT 0,
  base_sale_price numeric(12, 2) NOT NULL DEFAULT 0,
  status product_status NOT NULL DEFAULT 'active',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT products_base_cost_price_nonneg CHECK (base_cost_price >= 0),
  CONSTRAINT products_base_sale_price_nonneg CHECK (base_sale_price >= 0)
);

CREATE INDEX products_organization_id_idx ON products (organization_id);
CREATE INDEX products_organization_status_idx ON products (organization_id, status);
CREATE INDEX products_category_id_idx ON products (category_id);
CREATE INDEX products_organization_name_idx ON products (organization_id, name);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  name text NOT NULL,
  sku text NOT NULL,
  barcode text,
  cost_price numeric(12, 2),
  sale_price numeric(12, 2),
  reorder_point integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT product_variants_sku_not_empty CHECK (char_length(trim(sku)) > 0),
  CONSTRAINT product_variants_cost_price_nonneg CHECK (cost_price IS NULL OR cost_price >= 0),
  CONSTRAINT product_variants_sale_price_nonneg CHECK (sale_price IS NULL OR sale_price >= 0),
  CONSTRAINT product_variants_reorder_point_nonneg CHECK (reorder_point >= 0)
);

CREATE UNIQUE INDEX product_variants_organization_sku_key
  ON product_variants (organization_id, sku);

CREATE UNIQUE INDEX product_variants_organization_barcode_active_key
  ON product_variants (organization_id, barcode)
  WHERE barcode IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX product_variants_product_id_idx ON product_variants (product_id);
CREATE INDEX product_variants_organization_id_idx ON product_variants (organization_id);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
