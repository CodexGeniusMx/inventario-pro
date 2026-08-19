-- 00027_commercial_hardening_permissions.sql
-- Auth helpers, RLS policies, settings RPC, and granular permissions.
-- Runs after 00026 commits so new app_role enum values can be referenced safely.

-- Privileged admin includes owner + legacy admin
CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_org_admin();
$$;

GRANT EXECUTE ON FUNCTION is_org_admin() TO authenticated;

CREATE POLICY user_invitations_admin_manage
  ON user_invitations FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND (is_org_admin() OR has_permission('users', 'invite'))
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND (is_org_admin() OR has_permission('users', 'invite'))
  );

DROP POLICY IF EXISTS profiles_admin_manage ON profiles;
CREATE POLICY profiles_admin_manage
  ON profiles FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND (
      is_org_admin()
      OR has_permission('users', 'change_role')
      OR has_permission('users', 'deactivate')
    )
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND (
      is_org_admin()
      OR has_permission('users', 'change_role')
      OR has_permission('users', 'deactivate')
    )
  );

-- Organization settings update (server-authoritative)
CREATE OR REPLACE FUNCTION update_organization_settings(
  p_name text DEFAULT NULL,
  p_timezone text DEFAULT NULL,
  p_currency_code char(3) DEFAULT NULL,
  p_allowed_currencies text[] DEFAULT NULL,
  p_default_warehouse_id uuid DEFAULT NULL,
  p_ai_enabled boolean DEFAULT NULL,
  p_ai_allow_queries boolean DEFAULT NULL,
  p_ai_allow_prepare boolean DEFAULT NULL,
  p_ai_require_confirmation boolean DEFAULT NULL,
  p_whatsapp_enabled boolean DEFAULT NULL,
  p_whatsapp_business_number text DEFAULT NULL,
  p_whatsapp_connected boolean DEFAULT NULL,
  p_whatsapp_low_stock_alerts boolean DEFAULT NULL,
  p_whatsapp_out_of_stock_alerts boolean DEFAULT NULL,
  p_whatsapp_daily_sales_summary boolean DEFAULT NULL,
  p_whatsapp_purchase_received_alerts boolean DEFAULT NULL,
  p_whatsapp_pending_purchase_reminders boolean DEFAULT NULL,
  p_whatsapp_keep_ai_queries boolean DEFAULT NULL
)
RETURNS organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org organizations%ROWTYPE;
  v_org_id uuid := get_user_organization_id();
  v_allowed text[];
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF NOT (
    is_org_admin()
    OR has_permission('settings', 'write')
    OR has_permission('settings', 'company')
    OR has_permission('settings', 'currency')
    OR has_permission('settings', 'ai')
    OR has_permission('settings', 'whatsapp')
  ) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  SELECT * INTO v_org FROM organizations WHERE id = v_org_id FOR UPDATE;

  v_allowed := COALESCE(p_allowed_currencies, v_org.allowed_currencies);

  IF cardinality(v_allowed) < 1 THEN
    RAISE EXCEPTION 'allowed_currencies_required';
  END IF;

  IF NOT (v_allowed <@ ARRAY['MXN', 'USD']::text[]) THEN
    RAISE EXCEPTION 'unsupported_currency';
  END IF;

  IF p_currency_code IS NOT NULL AND NOT (p_currency_code = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'base_currency_not_allowed';
  END IF;

  IF p_default_warehouse_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM warehouses w
    WHERE w.id = p_default_warehouse_id
      AND w.organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'invalid_default_warehouse';
  END IF;

  UPDATE organizations
  SET
    name = COALESCE(NULLIF(trim(p_name), ''), name),
    timezone = COALESCE(NULLIF(trim(p_timezone), ''), timezone),
    currency_code = COALESCE(p_currency_code, currency_code),
    allowed_currencies = v_allowed,
    default_warehouse_id = COALESCE(p_default_warehouse_id, default_warehouse_id),
    ai_enabled = COALESCE(p_ai_enabled, ai_enabled),
    ai_allow_queries = COALESCE(p_ai_allow_queries, ai_allow_queries),
    ai_allow_prepare = COALESCE(p_ai_allow_prepare, ai_allow_prepare),
    ai_require_confirmation = COALESCE(p_ai_require_confirmation, ai_require_confirmation),
    whatsapp_enabled = COALESCE(p_whatsapp_enabled, whatsapp_enabled),
    whatsapp_business_number = COALESCE(p_whatsapp_business_number, whatsapp_business_number),
    whatsapp_connected = COALESCE(p_whatsapp_connected, whatsapp_connected),
    whatsapp_low_stock_alerts = COALESCE(p_whatsapp_low_stock_alerts, whatsapp_low_stock_alerts),
    whatsapp_out_of_stock_alerts = COALESCE(p_whatsapp_out_of_stock_alerts, whatsapp_out_of_stock_alerts),
    whatsapp_daily_sales_summary = COALESCE(p_whatsapp_daily_sales_summary, whatsapp_daily_sales_summary),
    whatsapp_purchase_received_alerts = COALESCE(p_whatsapp_purchase_received_alerts, whatsapp_purchase_received_alerts),
    whatsapp_pending_purchase_reminders = COALESCE(p_whatsapp_pending_purchase_reminders, whatsapp_pending_purchase_reminders),
    whatsapp_keep_ai_queries = COALESCE(p_whatsapp_keep_ai_queries, whatsapp_keep_ai_queries)
  WHERE id = v_org_id
  RETURNING * INTO v_org;

  RETURN v_org;
END;
$$;

GRANT EXECUTE ON FUNCTION update_organization_settings(
  text, text, char(3), text[], uuid,
  boolean, boolean, boolean, boolean,
  boolean, text, boolean,
  boolean, boolean, boolean, boolean, boolean, boolean
) TO authenticated;

INSERT INTO permissions (resource, action) VALUES
  ('products', 'view'),
  ('products', 'create'),
  ('products', 'edit'),
  ('products', 'archive'),
  ('products', 'view_cost'),
  ('inventory', 'view'),
  ('inventory', 'view_movements'),
  ('inventory', 'receive'),
  ('purchases', 'view'),
  ('purchases', 'create'),
  ('purchases', 'approve'),
  ('purchases', 'view_cost'),
  ('sales', 'view'),
  ('sales', 'create'),
  ('sales', 'cancel'),
  ('sales', 'return'),
  ('sales', 'view_all'),
  ('financial', 'revenue'),
  ('financial', 'costs'),
  ('financial', 'profit'),
  ('financial', 'export'),
  ('customers', 'view'),
  ('customers', 'create'),
  ('customers', 'edit'),
  ('suppliers', 'view'),
  ('suppliers', 'create'),
  ('suppliers', 'edit'),
  ('users', 'invite'),
  ('users', 'change_role'),
  ('users', 'deactivate'),
  ('settings', 'company'),
  ('settings', 'currency'),
  ('settings', 'inventory'),
  ('settings', 'ai'),
  ('settings', 'whatsapp')
ON CONFLICT (resource, action) DO NOTHING;

-- Helper: grant permission set to role
CREATE OR REPLACE FUNCTION _grant_role_permissions(
  p_role app_role,
  p_pairs text[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  pair text;
  parts text[];
  perm_id uuid;
BEGIN
  FOREACH pair IN ARRAY p_pairs LOOP
    parts := string_to_array(pair, ':');
    SELECT id INTO perm_id
    FROM permissions
    WHERE resource = parts[1] AND action = parts[2];

    IF perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role, permission_id)
      VALUES (p_role, perm_id)
      ON CONFLICT (role, permission_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Owner: all permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'owner', p.id FROM permissions p
ON CONFLICT (role, permission_id) DO NOTHING;

-- Admin: all permissions (owner-only actions enforced in app layer)
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', p.id FROM permissions p
ON CONFLICT (role, permission_id) DO NOTHING;

-- Manager
SELECT _grant_role_permissions('manager', ARRAY[
  'products:read', 'products:write', 'products:view', 'products:create', 'products:edit', 'products:archive', 'products:view_cost',
  'categories:read', 'categories:write',
  'inventory:read', 'inventory:adjust', 'inventory:view', 'inventory:view_movements', 'inventory:receive',
  'purchases:read', 'purchases:write', 'purchases:receive', 'purchases:view', 'purchases:create', 'purchases:approve', 'purchases:view_cost',
  'sales:read', 'sales:write', 'sales:complete', 'sales:view', 'sales:create', 'sales:cancel', 'sales:return', 'sales:view_all',
  'returns:read', 'returns:write',
  'customers:read', 'customers:write', 'customers:view', 'customers:create', 'customers:edit',
  'suppliers:read', 'suppliers:write', 'suppliers:view', 'suppliers:create', 'suppliers:edit',
  'reports:read', 'financial:revenue', 'financial:costs', 'financial:profit', 'financial:export',
  'users:read', 'settings:read', 'settings:inventory'
]);

-- Seller (Vendedor)
SELECT _grant_role_permissions('seller', ARRAY[
  'products:read', 'products:view',
  'categories:read',
  'inventory:read', 'inventory:view',
  'sales:read', 'sales:write', 'sales:complete', 'sales:view', 'sales:create', 'sales:return', 'sales:view_all',
  'returns:read', 'returns:write',
  'customers:read', 'customers:write', 'customers:view', 'customers:create', 'customers:edit',
  'suppliers:read', 'suppliers:view'
]);

-- Warehouse (Almacén)
SELECT _grant_role_permissions('warehouse', ARRAY[
  'products:read', 'products:view',
  'categories:read',
  'inventory:read', 'inventory:adjust', 'inventory:view', 'inventory:view_movements', 'inventory:receive',
  'purchases:read', 'purchases:receive', 'purchases:view',
  'suppliers:read', 'suppliers:view'
]);

-- Read-only / Auditor
SELECT _grant_role_permissions('read_only', ARRAY[
  'products:read', 'products:view',
  'categories:read',
  'inventory:read', 'inventory:view', 'inventory:view_movements',
  'purchases:read', 'purchases:view',
  'sales:read', 'sales:view', 'sales:view_all',
  'returns:read',
  'customers:read', 'customers:view',
  'suppliers:read', 'suppliers:view',
  'reports:read', 'audit:read',
  'users:read', 'settings:read'
]);

DROP FUNCTION _grant_role_permissions(app_role, text[]);

-- Ensure legacy admin retains full permission set alongside owner
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', rp.permission_id
FROM role_permissions rp
WHERE rp.role = 'owner'
ON CONFLICT (role, permission_id) DO NOTHING;
