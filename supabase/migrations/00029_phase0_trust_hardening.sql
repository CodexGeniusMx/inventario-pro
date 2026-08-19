-- 00029_phase0_trust_hardening.sql
-- Phase 0: profile escalation fix, RLS alignment, audit foundation, atomic PO create.

-- ---------------------------------------------------------------------------
-- Profile: default warehouse assignment + privileged column protection
-- ---------------------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS default_warehouse_id uuid REFERENCES warehouses (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_default_warehouse_id_idx
  ON profiles (default_warehouse_id);

CREATE OR REPLACE FUNCTION protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
     AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active
     AND NEW.branch_id IS NOT DISTINCT FROM OLD.branch_id
     AND NEW.default_warehouse_id IS NOT DISTINCT FROM OLD.default_warehouse_id THEN
    RETURN NEW;
  END IF;

  IF NEW.id = auth.uid() THEN
    RAISE EXCEPTION 'profile_privileged_self_update_denied';
  END IF;

  IF NOT (
    is_org_admin()
    OR has_permission('users', 'change_role')
    OR has_permission('users', 'deactivate')
  ) THEN
    RAISE EXCEPTION 'profile_privileged_update_denied';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_privileged ON profiles;
CREATE TRIGGER trg_profiles_protect_privileged
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_privileged_columns();

-- ---------------------------------------------------------------------------
-- Audit logs: source column + centralized insert RPC
-- ---------------------------------------------------------------------------

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'ui';

ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_source_not_empty;

ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_source_not_empty
    CHECK (char_length(trim(source)) > 0);

CREATE OR REPLACE FUNCTION insert_audit_log(
  p_organization_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_source text DEFAULT 'ui'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_id uuid;
  v_actor uuid := auth.uid();
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_required';
  END IF;

  IF v_actor IS NOT NULL THEN
    PERFORM assert_same_organization(p_organization_id);
  END IF;

  IF char_length(trim(p_action)) = 0 OR char_length(trim(p_entity_type)) = 0 THEN
    RAISE EXCEPTION 'invalid_audit_payload';
  END IF;

  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    source
  )
  VALUES (
    p_organization_id,
    v_actor,
    trim(p_action),
    trim(p_entity_type),
    p_entity_id,
    p_old_values,
    p_new_values,
    COALESCE(NULLIF(trim(p_source), ''), 'ui')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_audit_log(
  uuid, text, text, uuid, jsonb, jsonb, text
) TO authenticated;

CREATE OR REPLACE FUNCTION audit_profile_privileged_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
       OR NEW.default_warehouse_id IS DISTINCT FROM OLD.default_warehouse_id
     ) THEN
    PERFORM insert_audit_log(
      NEW.organization_id,
      'profile.privileged_update',
      'profile',
      NEW.id,
      jsonb_build_object(
        'role', OLD.role,
        'organization_id', OLD.organization_id,
        'is_active', OLD.is_active,
        'branch_id', OLD.branch_id,
        'default_warehouse_id', OLD.default_warehouse_id
      ),
      jsonb_build_object(
        'role', NEW.role,
        'organization_id', NEW.organization_id,
        'is_active', NEW.is_active,
        'branch_id', NEW.branch_id,
        'default_warehouse_id', NEW.default_warehouse_id
      ),
      'ui'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_audit_privileged ON profiles;
CREATE TRIGGER trg_profiles_audit_privileged
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profile_privileged_change();

-- ---------------------------------------------------------------------------
-- RLS permission helpers (granular alignment with app layer)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION can_write_products()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_org_admin()
    OR has_permission('products', 'create')
    OR has_permission('products', 'edit')
    OR has_permission('products', 'archive')
    OR has_permission('products', 'write');
$$;

CREATE OR REPLACE FUNCTION can_write_categories()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_org_admin()
    OR has_permission('categories', 'write');
$$;

CREATE OR REPLACE FUNCTION can_write_suppliers()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_org_admin()
    OR has_permission('suppliers', 'create')
    OR has_permission('suppliers', 'edit')
    OR has_permission('suppliers', 'write');
$$;

CREATE OR REPLACE FUNCTION can_write_warehouses()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_org_admin()
    OR has_permission('settings', 'inventory');
$$;

CREATE OR REPLACE FUNCTION can_write_purchase_orders()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_org_admin()
    OR has_permission('purchases', 'create')
    OR has_permission('purchases', 'write');
$$;

CREATE OR REPLACE FUNCTION can_manage_branches()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_org_admin()
    OR has_permission('settings', 'company');
$$;

CREATE OR REPLACE FUNCTION can_read_audit_logs()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_org_admin()
    OR has_permission('audit', 'read');
$$;

GRANT EXECUTE ON FUNCTION can_write_products() TO authenticated;
GRANT EXECUTE ON FUNCTION can_write_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION can_write_suppliers() TO authenticated;
GRANT EXECUTE ON FUNCTION can_write_warehouses() TO authenticated;
GRANT EXECUTE ON FUNCTION can_write_purchase_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_branches() TO authenticated;
GRANT EXECUTE ON FUNCTION can_read_audit_logs() TO authenticated;

-- Categories
DROP POLICY IF EXISTS categories_admin_write ON categories;
CREATE POLICY categories_manage
  ON categories FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND can_write_categories()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND can_write_categories()
  );

-- Products
DROP POLICY IF EXISTS products_admin_write ON products;
CREATE POLICY products_manage
  ON products FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND can_write_products()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND can_write_products()
  );

-- Product variants
DROP POLICY IF EXISTS product_variants_admin_write ON product_variants;
CREATE POLICY product_variants_manage
  ON product_variants FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND can_write_products()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND can_write_products()
  );

-- Suppliers
DROP POLICY IF EXISTS suppliers_admin_write ON suppliers;
CREATE POLICY suppliers_manage
  ON suppliers FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND can_write_suppliers()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND can_write_suppliers()
  );

-- Warehouses
DROP POLICY IF EXISTS warehouses_admin_write ON warehouses;
CREATE POLICY warehouses_manage
  ON warehouses FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND can_write_warehouses()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND can_write_warehouses()
  );

-- Branches
DROP POLICY IF EXISTS branches_admin_write ON branches;
CREATE POLICY branches_manage
  ON branches FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND can_manage_branches()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND can_manage_branches()
  );

-- Variant reorder points
DROP POLICY IF EXISTS variant_reorder_points_admin_write ON variant_reorder_points;
CREATE POLICY variant_reorder_points_manage
  ON variant_reorder_points FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND (
      can_write_products()
      OR has_permission('inventory', 'adjust')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND (
      can_write_products()
      OR has_permission('inventory', 'adjust')
    )
  );

-- Purchase orders
DROP POLICY IF EXISTS purchase_orders_admin_write ON purchase_orders;
CREATE POLICY purchase_orders_manage
  ON purchase_orders FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND can_write_purchase_orders()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND can_write_purchase_orders()
  );

DROP POLICY IF EXISTS purchase_order_items_admin_write ON purchase_order_items;
CREATE POLICY purchase_order_items_manage
  ON purchase_order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
        AND po.organization_id = get_user_organization_id()
        AND can_write_purchase_orders()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = purchase_order_items.purchase_order_id
        AND po.organization_id = get_user_organization_id()
        AND can_write_purchase_orders()
    )
  );

-- Audit logs read for auditors
DROP POLICY IF EXISTS audit_logs_admin_select ON audit_logs;
CREATE POLICY audit_logs_select_org
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND can_read_audit_logs()
  );

-- ---------------------------------------------------------------------------
-- Atomic purchase order creation (header + lines + audit in one transaction)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_purchase_order(
  p_organization_id uuid,
  p_supplier_id uuid,
  p_warehouse_id uuid,
  p_created_by uuid,
  p_lines jsonb,
  p_notes text DEFAULT NULL,
  p_currency_code char(3) DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_po_id uuid;
  v_document_number text;
  v_line jsonb;
  v_variant_id uuid;
  v_qty integer;
  v_unit_cost numeric(12, 2);
  v_line_total numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_total numeric(12, 2);
  v_currency char(3);
  v_allowed text[];
  v_line_count integer := 0;
BEGIN
  PERFORM assert_same_organization(p_organization_id);

  IF NOT can_write_purchase_orders() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'lines_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM suppliers s
    WHERE s.id = p_supplier_id
      AND s.organization_id = p_organization_id
      AND s.deleted_at IS NULL
      AND s.is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_supplier';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM warehouses w
    WHERE w.id = p_warehouse_id
      AND w.organization_id = p_organization_id
      AND w.is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_warehouse';
  END IF;

  SELECT o.allowed_currencies, o.currency_code
  INTO v_allowed, v_currency
  FROM organizations o
  WHERE o.id = p_organization_id;

  v_currency := COALESCE(p_currency_code, v_currency);

  IF NOT (v_currency = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'unsupported_currency';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    v_variant_id := (v_line ->> 'product_variant_id')::uuid;
    v_qty := (v_line ->> 'quantity_ordered')::integer;
    v_unit_cost := (v_line ->> 'unit_cost')::numeric;

    IF v_variant_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'invalid_line_quantity';
    END IF;

    IF v_unit_cost IS NULL OR v_unit_cost < 0 THEN
      RAISE EXCEPTION 'invalid_unit_cost';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = v_variant_id
        AND pv.organization_id = p_organization_id
        AND pv.deleted_at IS NULL
        AND pv.is_active = true
        AND p.deleted_at IS NULL
        AND p.status = 'active'
    ) THEN
      RAISE EXCEPTION 'invalid_line_variant';
    END IF;

    v_line_total := round(v_qty * v_unit_cost, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_line_count := v_line_count + 1;
  END LOOP;

  IF v_line_count = 0 THEN
    RAISE EXCEPTION 'lines_required';
  END IF;

  v_total := v_subtotal;
  v_document_number := next_document_number(p_organization_id, 'purchase_order');

  INSERT INTO purchase_orders (
    organization_id,
    supplier_id,
    warehouse_id,
    document_number,
    status,
    ordered_at,
    notes,
    subtotal,
    total,
    currency_code,
    created_by
  )
  VALUES (
    p_organization_id,
    p_supplier_id,
    p_warehouse_id,
    v_document_number,
    'ordered',
    now(),
    p_notes,
    v_subtotal,
    v_total,
    v_currency,
    p_created_by
  )
  RETURNING id INTO v_po_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    v_variant_id := (v_line ->> 'product_variant_id')::uuid;
    v_qty := (v_line ->> 'quantity_ordered')::integer;
    v_unit_cost := (v_line ->> 'unit_cost')::numeric;
    v_line_total := round(v_qty * v_unit_cost, 2);

    INSERT INTO purchase_order_items (
      purchase_order_id,
      product_variant_id,
      quantity_ordered,
      quantity_received,
      unit_cost,
      line_total
    )
    VALUES (
      v_po_id,
      v_variant_id,
      v_qty,
      0,
      v_unit_cost,
      v_line_total
    );
  END LOOP;

  PERFORM insert_audit_log(
    p_organization_id,
    'purchase_order.create',
    'purchase_order',
    v_po_id,
    NULL,
    jsonb_build_object(
      'document_number', v_document_number,
      'supplier_id', p_supplier_id,
      'warehouse_id', p_warehouse_id,
      'line_count', v_line_count,
      'total', v_total,
      'currency_code', v_currency
    ),
    'ui'
  );

  RETURN v_po_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_purchase_order(
  uuid, uuid, uuid, uuid, jsonb, text, char(3)
) TO authenticated;

-- ---------------------------------------------------------------------------
-- Invitation acceptance: apply warehouse assignment to profile
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION complete_user_invitation(p_invitation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv user_invitations%ROWTYPE;
  v_user_email text;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_inv
  FROM user_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;

  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation_not_pending';
  END IF;

  IF v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'invitation_expired';
  END IF;

  IF lower(trim(v_inv.email)) <> lower(trim(v_user_email)) THEN
    RAISE EXCEPTION 'invitation_email_mismatch';
  END IF;

  IF v_inv.warehouse_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM warehouses w
    WHERE w.id = v_inv.warehouse_id
      AND w.organization_id = v_inv.organization_id
  ) THEN
    RAISE EXCEPTION 'invalid_invitation_warehouse';
  END IF;

  INSERT INTO profiles (
    id,
    organization_id,
    branch_id,
    default_warehouse_id,
    full_name,
    role,
    is_active
  )
  VALUES (
    auth.uid(),
    v_inv.organization_id,
    v_inv.branch_id,
    v_inv.warehouse_id,
    split_part(v_user_email, '@', 1),
    v_inv.role,
    true
  );

  UPDATE user_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = p_invitation_id;

  PERFORM insert_audit_log(
    v_inv.organization_id,
    'user.invitation_accepted',
    'profile',
    auth.uid(),
    NULL,
    jsonb_build_object(
      'role', v_inv.role,
      'branch_id', v_inv.branch_id,
      'default_warehouse_id', v_inv.warehouse_id,
      'invitation_id', p_invitation_id
    ),
    'ui'
  );

  RETURN v_inv.organization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_user_invitation(uuid) TO authenticated;
