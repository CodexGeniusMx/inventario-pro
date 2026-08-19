-- 00030_phase0_security_closure.sql
-- Phase 0 final security closure (runs AFTER 00029).

-- ---------------------------------------------------------------------------
-- 1. Financial visibility helpers (DB authority for cost/profit masking)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION can_view_product_costs()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_org_admin()
    OR has_permission('products', 'view_cost')
    OR has_permission('purchases', 'view_cost')
    OR has_permission('financial', 'costs');
$$;

CREATE OR REPLACE FUNCTION can_view_financial_profit()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_org_admin()
    OR has_permission('financial', 'profit');
$$;

CREATE OR REPLACE FUNCTION can_manage_role_permissions()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_org_admin()
    OR has_permission('roles', 'manage_permissions');
$$;

GRANT EXECUTE ON FUNCTION can_view_product_costs() TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_financial_profit() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_role_permissions() TO authenticated;

INSERT INTO permissions (resource, action) VALUES
  ('roles', 'manage_permissions')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT r.role, p.id
FROM (VALUES ('owner'::app_role), ('admin'::app_role)) AS r(role)
JOIN permissions p ON p.resource = 'roles' AND p.action = 'manage_permissions'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Profile organization reference integrity (branch + warehouse)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_profile_org_references()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM branches b
    WHERE b.id = NEW.branch_id
      AND b.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'profile_branch_organization_mismatch';
  END IF;

  IF NEW.default_warehouse_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM warehouses w
    WHERE w.id = NEW.default_warehouse_id
      AND w.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'profile_warehouse_organization_mismatch';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_validate_org_refs ON profiles;
CREATE TRIGGER trg_profiles_validate_org_refs
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile_org_references();

-- ---------------------------------------------------------------------------
-- 3. Last-owner protection
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION protect_last_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer;
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.role = 'owner'
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
     ) THEN
    SELECT count(*)::integer
    INTO v_remaining
    FROM profiles p
    WHERE p.organization_id = OLD.organization_id
      AND p.role = 'owner'
      AND p.is_active = true
      AND p.id <> OLD.id;

    IF v_remaining < 1 THEN
      RAISE EXCEPTION 'last_owner_protected';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_last_owner ON profiles;
CREATE TRIGGER trg_profiles_protect_last_owner
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_last_owner();

-- ---------------------------------------------------------------------------
-- 3b. Cost column write protection (preserve cost when caller lacks permission)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION protect_product_cost_on_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NOT can_view_product_costs() THEN
    NEW.base_cost_price := OLD.base_cost_price;
  ELSIF TG_OP = 'INSERT' AND NOT can_view_product_costs() THEN
    NEW.base_cost_price := COALESCE(NEW.base_cost_price, 0);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION protect_variant_cost_on_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NOT can_view_product_costs() THEN
    NEW.cost_price := OLD.cost_price;
  ELSIF TG_OP = 'INSERT' AND NOT can_view_product_costs() THEN
    NEW.cost_price := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_protect_cost ON products;
CREATE TRIGGER trg_products_protect_cost
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION protect_product_cost_on_write();

DROP TRIGGER IF EXISTS trg_product_variants_protect_cost ON product_variants;
CREATE TRIGGER trg_product_variants_protect_cost
  BEFORE INSERT OR UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION protect_variant_cost_on_write();

-- ---------------------------------------------------------------------------
-- 4. Audit log: internal writer; revoke client-facing insert RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION audit_log_record(
  p_organization_id uuid,
  p_actor_id uuid,
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
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_required';
  END IF;

  IF char_length(trim(p_action)) = 0 OR char_length(trim(p_entity_type)) = 0 THEN
    RAISE EXCEPTION 'invalid_audit_payload';
  END IF;

  IF p_actor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM profiles pr
    WHERE pr.id = p_actor_id
      AND pr.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'invalid_audit_actor';
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
    p_actor_id,
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

GRANT EXECUTE ON FUNCTION audit_log_record(
  uuid, uuid, text, text, uuid, jsonb, jsonb, text
) TO service_role;

-- Deny legacy client-facing audit RPC (service/server uses audit_log_record).
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
BEGIN
  RAISE EXCEPTION 'audit_log_direct_insert_denied';
END;
$$;

REVOKE ALL ON FUNCTION insert_audit_log(
  uuid, text, text, uuid, jsonb, jsonb, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION insert_audit_log(
  uuid, text, text, uuid, jsonb, jsonb, text
) FROM authenticated;

-- ---------------------------------------------------------------------------
-- 4b. Purchase orders: idempotency column (before views/RPCs reference it)
-- ---------------------------------------------------------------------------

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_org_idempotency_key_idx
  ON purchase_orders (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Permission-aware read views (mask cost/profit at DB boundary)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_products
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.organization_id,
  p.category_id,
  p.name,
  p.description,
  p.unit_of_measure,
  CASE WHEN can_view_product_costs() THEN p.base_cost_price ELSE NULL END AS base_cost_price,
  p.base_sale_price,
  p.status,
  p.deleted_at,
  p.created_at,
  p.updated_at
FROM products p;

CREATE OR REPLACE VIEW v_product_variants
WITH (security_invoker = true)
AS
SELECT
  v.id,
  v.organization_id,
  v.product_id,
  v.name,
  v.sku,
  v.barcode,
  CASE WHEN can_view_product_costs() THEN v.cost_price ELSE NULL END AS cost_price,
  v.sale_price,
  v.reorder_point,
  v.is_active,
  v.deleted_at,
  v.created_at,
  v.updated_at
FROM product_variants v;

CREATE OR REPLACE VIEW v_purchase_orders
WITH (security_invoker = true)
AS
SELECT
  po.id,
  po.organization_id,
  po.supplier_id,
  po.warehouse_id,
  po.document_number,
  po.status,
  po.ordered_at,
  po.notes,
  CASE WHEN can_view_product_costs() THEN po.subtotal ELSE NULL END AS subtotal,
  CASE WHEN can_view_product_costs() THEN po.total ELSE NULL END AS total,
  po.currency_code,
  po.created_by,
  po.created_at,
  po.updated_at,
  po.idempotency_key
FROM purchase_orders po;

CREATE OR REPLACE VIEW v_purchase_order_items
WITH (security_invoker = true)
AS
SELECT
  poi.id,
  poi.purchase_order_id,
  poi.product_variant_id,
  poi.quantity_ordered,
  poi.quantity_received,
  CASE WHEN can_view_product_costs() THEN poi.unit_cost ELSE NULL END AS unit_cost,
  CASE WHEN can_view_product_costs() THEN poi.line_total ELSE NULL END AS line_total
FROM purchase_order_items poi;

CREATE OR REPLACE VIEW v_purchase_receipt_items
WITH (security_invoker = true)
AS
SELECT
  pri.id,
  pri.purchase_receipt_id,
  pri.purchase_order_item_id,
  pri.product_variant_id,
  pri.quantity_received,
  CASE WHEN can_view_product_costs() THEN pri.unit_cost ELSE NULL END AS unit_cost,
  pri.movement_id
FROM purchase_receipt_items pri;

CREATE OR REPLACE VIEW v_inventory_valuation
WITH (security_invoker = true)
AS
SELECT
  b.organization_id,
  b.warehouse_id,
  w.name AS warehouse_name,
  b.product_variant_id,
  p.id AS product_id,
  p.name AS product_name,
  p.status AS product_status,
  v.name AS variant_name,
  v.sku,
  b.quantity_on_hand,
  CASE
    WHEN can_view_product_costs()
      THEN resolve_variant_cost_price(v.cost_price, p.base_cost_price)
    ELSE NULL
  END AS unit_cost,
  CASE
    WHEN can_view_product_costs()
      THEN b.quantity_on_hand
        * resolve_variant_cost_price(v.cost_price, p.base_cost_price)
    ELSE NULL
  END AS inventory_value
FROM inventory_balances b
JOIN warehouses w ON w.id = b.warehouse_id
JOIN product_variants v ON v.id = b.product_variant_id
JOIN products p ON p.id = v.product_id
WHERE v.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.status = 'active'::product_status
  AND v.is_active = true;

CREATE OR REPLACE VIEW v_inventory_status
WITH (security_invoker = true)
AS
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
  CASE
    WHEN can_view_product_costs()
      THEN resolve_variant_cost_price(v.cost_price, p.base_cost_price)
    ELSE NULL
  END AS cost_price
FROM inventory_balances b
JOIN warehouses w ON w.id = b.warehouse_id
JOIN product_variants v ON v.id = b.product_variant_id
JOIN products p ON p.id = v.product_id
LEFT JOIN variant_reorder_points vrp
  ON vrp.organization_id = b.organization_id
  AND vrp.warehouse_id = b.warehouse_id
  AND vrp.product_variant_id = b.product_variant_id
WHERE v.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.status = 'active';

REVOKE SELECT ON products FROM authenticated, anon;
REVOKE SELECT ON product_variants FROM authenticated, anon;
REVOKE SELECT ON purchase_orders FROM authenticated, anon;
REVOKE SELECT ON purchase_order_items FROM authenticated, anon;
REVOKE SELECT ON purchase_receipt_items FROM authenticated, anon;

GRANT SELECT ON v_products TO authenticated;
GRANT SELECT ON v_product_variants TO authenticated;
GRANT SELECT ON v_purchase_orders TO authenticated;
GRANT SELECT ON v_purchase_order_items TO authenticated;
GRANT SELECT ON v_purchase_receipt_items TO authenticated;

REVOKE SELECT ON v_completed_sale_lines FROM authenticated, anon;

-- Preserve write access on base tables (RLS enforced).
GRANT INSERT, UPDATE, DELETE ON products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON product_variants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON purchase_orders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON purchase_order_items TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Sales reporting RPC — mask profit metrics without permission
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION report_sales_summary(
  p_organization_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  sales_count bigint,
  units_sold bigint,
  return_units bigint,
  gross_revenue numeric,
  net_revenue numeric,
  discount_total numeric,
  return_revenue numeric,
  estimated_cogs numeric,
  estimated_gross_profit numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_show_profit boolean := can_view_financial_profit();
BEGIN
  PERFORM assert_same_organization(p_organization_id);

  IF NOT has_permission('reports', 'read') THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  RETURN QUERY
  WITH scoped_sales AS (
    SELECT s.id, s.discount_amount
    FROM sales s
    WHERE s.organization_id = p_organization_id
      AND s.status IN ('completed', 'partially_returned', 'fully_returned')
      AND s.completed_at >= p_from
      AND s.completed_at < p_to
  ),
  scoped_lines AS (
    SELECT l.*
    FROM v_completed_sale_lines l
    JOIN scoped_sales ss ON ss.id = l.sale_id
    WHERE l.organization_id = p_organization_id
      AND l.completed_at >= p_from
      AND l.completed_at < p_to
  )
  SELECT
    (SELECT COUNT(*)::bigint FROM scoped_sales),
    COALESCE((SELECT SUM(sl.net_quantity)::bigint FROM scoped_lines sl), 0),
    COALESCE((SELECT SUM(sl.quantity_returned)::bigint FROM scoped_lines sl), 0),
    COALESCE((SELECT SUM(sl.line_total) FROM scoped_lines sl), 0),
    COALESCE((SELECT SUM(sl.net_revenue) FROM scoped_lines sl), 0),
    COALESCE((SELECT SUM(ss.discount_amount) FROM scoped_sales ss), 0),
    COALESCE((SELECT SUM(sl.returned_revenue_estimate) FROM scoped_lines sl), 0),
    CASE
      WHEN v_show_profit
        THEN COALESCE((SELECT SUM(sl.estimated_cogs) FROM scoped_lines sl), 0)
      ELSE 0
    END,
    CASE
      WHEN v_show_profit
        THEN COALESCE((SELECT SUM(sl.net_revenue - sl.estimated_cogs) FROM scoped_lines sl), 0)
      ELSE 0
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION report_sales_summary(uuid, timestamptz, timestamptz) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Purchase order: actor binding + idempotency RPC
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS create_purchase_order(
  uuid, uuid, uuid, uuid, jsonb, text, char(3)
);

CREATE OR REPLACE FUNCTION create_purchase_order(
  p_organization_id uuid,
  p_supplier_id uuid,
  p_warehouse_id uuid,
  p_created_by uuid,
  p_lines jsonb,
  p_notes text DEFAULT NULL,
  p_currency_code char(3) DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL
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
  v_actor uuid := auth.uid();
  v_created_by uuid;
BEGIN
  PERFORM assert_same_organization(p_organization_id);

  IF NOT can_write_purchase_orders() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF v_actor IS NOT NULL THEN
    IF p_created_by IS NOT NULL AND p_created_by IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'created_by_spoof_denied';
    END IF;
    v_created_by := v_actor;
  ELSE
    v_created_by := p_created_by;
    IF v_created_by IS NULL THEN
      RAISE EXCEPTION 'created_by_required';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM profiles pr
      WHERE pr.id = v_created_by
        AND pr.organization_id = p_organization_id
        AND pr.is_active = true
    ) THEN
      RAISE EXCEPTION 'invalid_created_by';
    END IF;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT po.id
    INTO v_po_id
    FROM purchase_orders po
    WHERE po.organization_id = p_organization_id
      AND po.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_po_id IS NOT NULL THEN
      RETURN v_po_id;
    END IF;
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
    created_by,
    idempotency_key
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
    v_created_by,
    p_idempotency_key
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

  PERFORM audit_log_record(
    p_organization_id,
    v_created_by,
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
      'currency_code', v_currency,
      'idempotency_key', p_idempotency_key
    ),
    'ui'
  );

  RETURN v_po_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_purchase_order(
  uuid, uuid, uuid, uuid, jsonb, text, char(3), uuid
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Profile privileged audit + invitation acceptance (internal audit writer)
-- ---------------------------------------------------------------------------

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
    PERFORM audit_log_record(
      NEW.organization_id,
      auth.uid(),
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

  IF v_inv.branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM branches b
    WHERE b.id = v_inv.branch_id
      AND b.organization_id = v_inv.organization_id
  ) THEN
    RAISE EXCEPTION 'invalid_invitation_branch';
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

  PERFORM audit_log_record(
    v_inv.organization_id,
    auth.uid(),
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

-- Explicit deny writes on global permission matrix (future editor must use RPC).
CREATE POLICY role_permissions_deny_client_writes
  ON role_permissions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY role_permissions_deny_client_updates
  ON role_permissions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY role_permissions_deny_client_deletes
  ON role_permissions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);
