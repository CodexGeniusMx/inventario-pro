-- 00012_rls_policies.sql
-- Row Level Security

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_reorder_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations: users read own org only
CREATE POLICY organizations_select_own
  ON organizations FOR SELECT
  TO authenticated
  USING (id = get_user_organization_id());

-- Profiles
CREATE POLICY profiles_select_org
  ON profiles FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY profiles_select_self
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_self
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_admin_manage
  ON profiles FOR ALL
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_admin())
  WITH CHECK (organization_id = get_user_organization_id() AND is_admin());

-- Permissions catalog: readable by authenticated users
CREATE POLICY permissions_select_all
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY role_permissions_select_all
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Generic org-scoped read for operational tables
CREATE POLICY branches_select_org
  ON branches FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY branches_admin_write
  ON branches FOR ALL
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_admin())
  WITH CHECK (organization_id = get_user_organization_id() AND is_admin());

-- Catalog: read all org members, write admin
CREATE POLICY categories_select_org
  ON categories FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY categories_admin_write
  ON categories FOR ALL
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_admin())
  WITH CHECK (organization_id = get_user_organization_id() AND is_admin());

CREATE POLICY products_select_org
  ON products FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY products_admin_write
  ON products FOR ALL
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_admin())
  WITH CHECK (organization_id = get_user_organization_id() AND is_admin());

CREATE POLICY product_variants_select_org
  ON product_variants FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY product_variants_admin_write
  ON product_variants FOR ALL
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_admin())
  WITH CHECK (organization_id = get_user_organization_id() AND is_admin());

-- Parties & warehouses
CREATE POLICY suppliers_select_org
  ON suppliers FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY suppliers_admin_write
  ON suppliers FOR ALL
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_admin())
  WITH CHECK (organization_id = get_user_organization_id() AND is_admin());

CREATE POLICY customers_select_org
  ON customers FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY customers_insert_org
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_active_user()
    AND (is_admin() OR has_permission('customers', 'write'))
  );

CREATE POLICY customers_update_org
  ON customers FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id() AND (is_admin() OR has_permission('customers', 'write')))
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY warehouses_select_org
  ON warehouses FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY warehouses_admin_write
  ON warehouses FOR ALL
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_admin())
  WITH CHECK (organization_id = get_user_organization_id() AND is_admin());

CREATE POLICY variant_reorder_points_select_org
  ON variant_reorder_points FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY variant_reorder_points_admin_write
  ON variant_reorder_points FOR ALL
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_admin())
  WITH CHECK (organization_id = get_user_organization_id() AND is_admin());

-- Inventory: read org; direct writes denied (RPC only)
CREATE POLICY inventory_balances_select_org
  ON inventory_balances FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY inventory_movements_select_org
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY stock_adjustments_select_org
  ON stock_adjustments FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY stock_adjustment_items_select_org
  ON stock_adjustment_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM stock_adjustments sa
      WHERE sa.id = stock_adjustment_items.stock_adjustment_id
        AND sa.organization_id = get_user_organization_id()
    )
    AND is_active_user()
  );

-- Purchasing
CREATE POLICY purchase_orders_select_org
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY purchase_orders_admin_write
  ON purchase_orders FOR ALL
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_admin())
  WITH CHECK (organization_id = get_user_organization_id() AND is_admin());

CREATE POLICY purchase_order_items_select_org
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
        AND po.organization_id = get_user_organization_id()
    ) AND is_active_user()
  );

CREATE POLICY purchase_order_items_admin_write
  ON purchase_order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
        AND po.organization_id = get_user_organization_id()
        AND is_admin()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
        AND po.organization_id = get_user_organization_id()
        AND is_admin()
    )
  );

CREATE POLICY purchase_receipts_select_org
  ON purchase_receipts FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY purchase_receipt_items_select_org
  ON purchase_receipt_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_receipts pr
      WHERE pr.id = purchase_receipt_items.purchase_receipt_id
        AND pr.organization_id = get_user_organization_id()
    ) AND is_active_user()
  );

-- Sales: employees can read/create/update drafts; admin full
CREATE POLICY sales_select_org
  ON sales FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY sales_insert_org
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND is_active_user()
    AND (is_admin() OR has_permission('sales', 'write'))
  );

CREATE POLICY sales_update_org
  ON sales FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND is_active_user()
    AND (is_admin() OR has_permission('sales', 'write'))
  )
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY sale_items_select_org
  ON sale_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_items.sale_id
        AND s.organization_id = get_user_organization_id()
    ) AND is_active_user()
  );

CREATE POLICY sale_items_write_org
  ON sale_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_items.sale_id
        AND s.organization_id = get_user_organization_id()
        AND (is_admin() OR has_permission('sales', 'write'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_items.sale_id
        AND s.organization_id = get_user_organization_id()
        AND (is_admin() OR has_permission('sales', 'write'))
    )
  );

-- Returns
CREATE POLICY returns_select_org
  ON returns FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_active_user());

CREATE POLICY return_items_select_org
  ON return_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_items.return_id
        AND r.organization_id = get_user_organization_id()
    ) AND is_active_user()
  );

-- Audit logs: admin read only; inserts via SECURITY DEFINER functions
CREATE POLICY audit_logs_admin_select
  ON audit_logs FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id() AND is_admin());

-- Document sequences: no direct access for authenticated (RPC only)
CREATE POLICY document_sequences_deny_all
  ON document_sequences FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
