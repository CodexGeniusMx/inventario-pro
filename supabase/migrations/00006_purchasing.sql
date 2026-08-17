-- 00006_purchasing.sql
-- Purchase orders, receipts

CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES suppliers (id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  document_number text NOT NULL,
  status purchase_order_status NOT NULL DEFAULT 'draft',
  ordered_at timestamptz,
  notes text,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_orders_document_number_not_empty CHECK (char_length(trim(document_number)) > 0),
  CONSTRAINT purchase_orders_subtotal_nonneg CHECK (subtotal >= 0),
  CONSTRAINT purchase_orders_total_nonneg CHECK (total >= 0)
);

CREATE UNIQUE INDEX purchase_orders_organization_document_key
  ON purchase_orders (organization_id, document_number);

CREATE INDEX purchase_orders_organization_id_idx ON purchase_orders (organization_id);
CREATE INDEX purchase_orders_supplier_id_idx ON purchase_orders (supplier_id);
CREATE INDEX purchase_orders_status_idx ON purchase_orders (organization_id, status);

CREATE TABLE purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders (id) ON DELETE RESTRICT,
  product_variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  quantity_ordered integer NOT NULL,
  quantity_received integer NOT NULL DEFAULT 0,
  unit_cost numeric(12, 2) NOT NULL,
  line_total numeric(12, 2) NOT NULL,
  CONSTRAINT purchase_order_items_quantity_ordered_positive CHECK (quantity_ordered > 0),
  CONSTRAINT purchase_order_items_quantity_received_nonneg CHECK (quantity_received >= 0),
  CONSTRAINT purchase_order_items_received_lte_ordered CHECK (quantity_received <= quantity_ordered),
  CONSTRAINT purchase_order_items_unit_cost_nonneg CHECK (unit_cost >= 0),
  CONSTRAINT purchase_order_items_line_total_nonneg CHECK (line_total >= 0)
);

CREATE INDEX purchase_order_items_po_id_idx ON purchase_order_items (purchase_order_id);
CREATE INDEX purchase_order_items_variant_id_idx ON purchase_order_items (product_variant_id);

CREATE TABLE purchase_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders (id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  document_number text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_receipts_document_number_not_empty CHECK (char_length(trim(document_number)) > 0)
);

CREATE UNIQUE INDEX purchase_receipts_organization_document_key
  ON purchase_receipts (organization_id, document_number);

CREATE INDEX purchase_receipts_po_id_idx ON purchase_receipts (purchase_order_id);
CREATE INDEX purchase_receipts_organization_id_idx ON purchase_receipts (organization_id);

CREATE TABLE purchase_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_receipt_id uuid NOT NULL REFERENCES purchase_receipts (id) ON DELETE RESTRICT,
  purchase_order_item_id uuid NOT NULL REFERENCES purchase_order_items (id) ON DELETE RESTRICT,
  product_variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  quantity_received integer NOT NULL,
  unit_cost numeric(12, 2) NOT NULL,
  movement_id uuid NOT NULL REFERENCES inventory_movements (id) ON DELETE RESTRICT,
  CONSTRAINT purchase_receipt_items_quantity_positive CHECK (quantity_received > 0),
  CONSTRAINT purchase_receipt_items_unit_cost_nonneg CHECK (unit_cost >= 0)
);

CREATE UNIQUE INDEX purchase_receipt_items_movement_id_key
  ON purchase_receipt_items (movement_id);

CREATE INDEX purchase_receipt_items_receipt_id_idx ON purchase_receipt_items (purchase_receipt_id);

CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
