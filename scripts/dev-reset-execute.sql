-- DEVELOPMENT ONLY — scoped reset for organization 1d567ae8-0358-48e9-88ac-7e39b6f3bc5b

BEGIN;

DO $$
DECLARE
  target_org uuid := '1d567ae8-0358-48e9-88ac-7e39b6f3bc5b';
BEGIN
  ALTER TABLE inventory_movements DISABLE TRIGGER trg_inventory_movements_no_delete;

  UPDATE sale_items
  SET movement_id = NULL
  WHERE sale_id IN (SELECT id FROM sales WHERE organization_id = target_org);

  UPDATE return_items
  SET restock_movement_id = NULL,
      damage_movement_id = NULL
  WHERE return_id IN (SELECT id FROM returns WHERE organization_id = target_org);

  DELETE FROM purchase_receipt_items
  WHERE purchase_receipt_id IN (
    SELECT id FROM purchase_receipts WHERE organization_id = target_org
  );

  DELETE FROM stock_adjustment_items
  WHERE stock_adjustment_id IN (
    SELECT id FROM stock_adjustments WHERE organization_id = target_org
  );

  DELETE FROM inventory_movements WHERE organization_id = target_org;

  DELETE FROM return_items
  WHERE return_id IN (SELECT id FROM returns WHERE organization_id = target_org);

  DELETE FROM returns WHERE organization_id = target_org;

  DELETE FROM sale_items
  WHERE sale_id IN (SELECT id FROM sales WHERE organization_id = target_org);

  DELETE FROM sales WHERE organization_id = target_org;

  DELETE FROM purchase_receipts WHERE organization_id = target_org;

  DELETE FROM purchase_order_items
  WHERE purchase_order_id IN (
    SELECT id FROM purchase_orders WHERE organization_id = target_org
  );

  DELETE FROM purchase_orders WHERE organization_id = target_org;

  DELETE FROM stock_adjustments WHERE organization_id = target_org;

  DELETE FROM inventory_balances
  WHERE warehouse_id IN (SELECT id FROM warehouses WHERE organization_id = target_org);

  DELETE FROM variant_reorder_points WHERE organization_id = target_org;

  DELETE FROM customers WHERE organization_id = target_org;
  DELETE FROM suppliers WHERE organization_id = target_org;

  DELETE FROM product_variants WHERE organization_id = target_org;
  DELETE FROM products WHERE organization_id = target_org;
  DELETE FROM categories WHERE organization_id = target_org;

  ALTER TABLE inventory_movements ENABLE TRIGGER trg_inventory_movements_no_delete;

  UPDATE document_sequences
  SET last_value = 0
  WHERE organization_id = target_org
    AND document_kind IN (
      'sale',
      'purchase_order',
      'purchase_receipt',
      'return',
      'stock_adjustment'
    );

  INSERT INTO document_sequences (organization_id, document_kind, last_value)
  SELECT target_org, kind, 0
  FROM unnest(ARRAY[
    'sale'::document_kind,
    'purchase_order'::document_kind,
    'purchase_receipt'::document_kind,
    'return'::document_kind,
    'stock_adjustment'::document_kind
  ]) AS kind
  ON CONFLICT (organization_id, document_kind) DO NOTHING;
END $$;

COMMIT;
