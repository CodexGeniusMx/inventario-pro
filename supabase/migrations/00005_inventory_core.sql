-- 00005_inventory_core.sql
-- Inventory balances, movements, stock adjustments

CREATE TABLE inventory_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  product_variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  quantity_on_hand integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_balances_quantity_nonneg CHECK (quantity_on_hand >= 0)
);

CREATE UNIQUE INDEX inventory_balances_warehouse_variant_key
  ON inventory_balances (warehouse_id, product_variant_id);

CREATE INDEX inventory_balances_organization_id_idx ON inventory_balances (organization_id);
CREATE INDEX inventory_balances_variant_id_idx ON inventory_balances (product_variant_id);
CREATE INDEX inventory_balances_warehouse_qty_idx ON inventory_balances (warehouse_id, quantity_on_hand);

CREATE TABLE stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  document_number text NOT NULL,
  adjustment_type stock_adjustment_type NOT NULL,
  reason text NOT NULL,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_adjustments_reason_not_empty CHECK (char_length(trim(reason)) > 0),
  CONSTRAINT stock_adjustments_document_number_not_empty CHECK (char_length(trim(document_number)) > 0)
);

CREATE UNIQUE INDEX stock_adjustments_organization_document_key
  ON stock_adjustments (organization_id, document_number);

CREATE INDEX stock_adjustments_organization_id_idx ON stock_adjustments (organization_id);
CREATE INDEX stock_adjustments_warehouse_id_idx ON stock_adjustments (warehouse_id);

-- Movements table: document FK columns added in 00008 after dependent tables exist
CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  product_variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  movement_type movement_type NOT NULL,
  quantity integer NOT NULL,
  quantity_before integer NOT NULL,
  quantity_after integer NOT NULL,
  unit_cost numeric(12, 4),
  reason text,
  notes text,
  sale_id uuid,
  sale_item_id uuid,
  purchase_receipt_id uuid,
  purchase_receipt_item_id uuid,
  stock_adjustment_id uuid REFERENCES stock_adjustments (id) ON DELETE RESTRICT,
  return_id uuid,
  return_item_id uuid,
  idempotency_key text,
  created_by uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_movements_quantity_nonzero CHECK (quantity <> 0),
  CONSTRAINT inventory_movements_quantity_before_nonneg CHECK (quantity_before >= 0),
  CONSTRAINT inventory_movements_quantity_after_nonneg CHECK (quantity_after >= 0),
  CONSTRAINT inventory_movements_unit_cost_nonneg CHECK (unit_cost IS NULL OR unit_cost >= 0),
  CONSTRAINT inventory_movements_balance_equation CHECK (quantity_after = quantity_before + quantity)
);

CREATE UNIQUE INDEX inventory_movements_idempotency_key
  ON inventory_movements (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX inventory_movements_organization_created_idx
  ON inventory_movements (organization_id, created_at DESC);

CREATE INDEX inventory_movements_warehouse_variant_created_idx
  ON inventory_movements (warehouse_id, product_variant_id, created_at DESC);

CREATE INDEX inventory_movements_type_created_idx
  ON inventory_movements (movement_type, created_at DESC);

CREATE INDEX inventory_movements_stock_adjustment_id_idx
  ON inventory_movements (stock_adjustment_id);

CREATE TABLE stock_adjustment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_adjustment_id uuid NOT NULL REFERENCES stock_adjustments (id) ON DELETE RESTRICT,
  product_variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  quantity integer NOT NULL,
  movement_id uuid NOT NULL REFERENCES inventory_movements (id) ON DELETE RESTRICT,
  CONSTRAINT stock_adjustment_items_quantity_positive CHECK (quantity > 0)
);

CREATE UNIQUE INDEX stock_adjustment_items_movement_id_key
  ON stock_adjustment_items (movement_id);

CREATE INDEX stock_adjustment_items_adjustment_id_idx
  ON stock_adjustment_items (stock_adjustment_id);

CREATE OR REPLACE FUNCTION prevent_inventory_movement_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'inventory_movements are immutable';
END;
$$;

CREATE TRIGGER trg_inventory_movements_no_update
  BEFORE UPDATE ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_inventory_movement_mutation();

CREATE TRIGGER trg_inventory_movements_no_delete
  BEFORE DELETE ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_inventory_movement_mutation();

CREATE TRIGGER trg_inventory_balances_updated_at
  BEFORE UPDATE ON inventory_balances
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
