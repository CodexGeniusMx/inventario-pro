-- 00007_sales_and_returns.sql
-- Sales, sale items, returns

CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES customers (id) ON DELETE SET NULL,
  document_number text NOT NULL,
  status sale_status NOT NULL DEFAULT 'draft',
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_by uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_document_number_not_empty CHECK (char_length(trim(document_number)) > 0),
  CONSTRAINT sales_subtotal_nonneg CHECK (subtotal >= 0),
  CONSTRAINT sales_discount_nonneg CHECK (discount_amount >= 0),
  CONSTRAINT sales_total_nonneg CHECK (total >= 0)
);

CREATE UNIQUE INDEX sales_organization_document_key ON sales (organization_id, document_number);

CREATE INDEX sales_organization_id_idx ON sales (organization_id);
CREATE INDEX sales_organization_created_idx ON sales (organization_id, created_at DESC);
CREATE INDEX sales_customer_id_idx ON sales (customer_id);
CREATE INDEX sales_status_idx ON sales (organization_id, status);

CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales (id) ON DELETE RESTRICT,
  product_variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  quantity integer NOT NULL,
  quantity_returned integer NOT NULL DEFAULT 0,
  unit_price numeric(12, 2) NOT NULL,
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0,
  line_total numeric(12, 2) NOT NULL,
  movement_id uuid REFERENCES inventory_movements (id) ON DELETE RESTRICT,
  CONSTRAINT sale_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT sale_items_quantity_returned_nonneg CHECK (quantity_returned >= 0),
  CONSTRAINT sale_items_quantity_returned_lte_quantity CHECK (quantity_returned <= quantity),
  CONSTRAINT sale_items_unit_price_nonneg CHECK (unit_price >= 0),
  CONSTRAINT sale_items_discount_nonneg CHECK (discount_amount >= 0),
  CONSTRAINT sale_items_line_total_nonneg CHECK (line_total >= 0)
);

CREATE UNIQUE INDEX sale_items_movement_id_key ON sale_items (movement_id);

CREATE INDEX sale_items_sale_id_idx ON sale_items (sale_id);
CREATE INDEX sale_items_variant_id_idx ON sale_items (product_variant_id);

CREATE TABLE returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  sale_id uuid NOT NULL REFERENCES sales (id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  document_number text NOT NULL,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT returns_document_number_not_empty CHECK (char_length(trim(document_number)) > 0)
);

CREATE UNIQUE INDEX returns_organization_document_key ON returns (organization_id, document_number);

CREATE INDEX returns_sale_id_idx ON returns (sale_id);
CREATE INDEX returns_organization_id_idx ON returns (organization_id);

CREATE TABLE return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES returns (id) ON DELETE RESTRICT,
  sale_item_id uuid NOT NULL REFERENCES sale_items (id) ON DELETE RESTRICT,
  product_variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  quantity integer NOT NULL,
  is_restockable boolean NOT NULL DEFAULT true,
  restock_movement_id uuid REFERENCES inventory_movements (id) ON DELETE RESTRICT,
  damage_movement_id uuid REFERENCES inventory_movements (id) ON DELETE RESTRICT,
  CONSTRAINT return_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT return_items_one_movement_type CHECK (
    (is_restockable = true AND damage_movement_id IS NULL)
    OR (is_restockable = false AND restock_movement_id IS NULL)
  )
);

CREATE UNIQUE INDEX return_items_restock_movement_id_key
  ON return_items (restock_movement_id)
  WHERE restock_movement_id IS NOT NULL;

CREATE UNIQUE INDEX return_items_damage_movement_id_key
  ON return_items (damage_movement_id)
  WHERE damage_movement_id IS NOT NULL;

CREATE INDEX return_items_return_id_idx ON return_items (return_id);

-- Add deferred document foreign keys on inventory_movements
ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_sale_id_fkey
  FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE RESTRICT;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_sale_item_id_fkey
  FOREIGN KEY (sale_item_id) REFERENCES sale_items (id) ON DELETE RESTRICT;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_purchase_receipt_id_fkey
  FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipts (id) ON DELETE RESTRICT;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_purchase_receipt_item_id_fkey
  FOREIGN KEY (purchase_receipt_item_id) REFERENCES purchase_receipt_items (id) ON DELETE RESTRICT;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_return_id_fkey
  FOREIGN KEY (return_id) REFERENCES returns (id) ON DELETE RESTRICT;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_return_item_id_fkey
  FOREIGN KEY (return_item_id) REFERENCES return_items (id) ON DELETE RESTRICT;

CREATE INDEX inventory_movements_sale_id_idx ON inventory_movements (sale_id);
CREATE INDEX inventory_movements_purchase_receipt_id_idx ON inventory_movements (purchase_receipt_id);
CREATE INDEX inventory_movements_return_id_idx ON inventory_movements (return_id);

CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
