-- 00026_commercial_hardening_schema.sql
-- Organization settings, extended roles, purchase currency, invitations, AI/WhatsApp config

-- Extend app_role enum (legacy admin/employee preserved)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'seller';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'warehouse';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'read_only';

-- Organization commercial settings
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS allowed_currencies text[] NOT NULL DEFAULT ARRAY['MXN']::text[],
  ADD COLUMN IF NOT EXISTS default_warehouse_id uuid REFERENCES warehouses (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_prefix_sale text NOT NULL DEFAULT 'S-',
  ADD COLUMN IF NOT EXISTS document_prefix_purchase_order text NOT NULL DEFAULT 'PO-',
  ADD COLUMN IF NOT EXISTS document_prefix_purchase_receipt text NOT NULL DEFAULT 'PR-',
  ADD COLUMN IF NOT EXISTS document_prefix_return text NOT NULL DEFAULT 'R-',
  ADD COLUMN IF NOT EXISTS document_prefix_stock_adjustment text NOT NULL DEFAULT 'ADJ-',
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_allow_queries boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_allow_prepare boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_require_confirmation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_business_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_connected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_low_stock_alerts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_out_of_stock_alerts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_daily_sales_summary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_purchase_received_alerts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_pending_purchase_reminders boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_keep_ai_queries boolean NOT NULL DEFAULT false;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_allowed_currencies_nonempty
    CHECK (cardinality(allowed_currencies) >= 1),
  ADD CONSTRAINT organizations_allowed_currencies_supported
    CHECK (allowed_currencies <@ ARRAY['MXN', 'USD']::text[]),
  ADD CONSTRAINT organizations_base_in_allowed_currencies
    CHECK (currency_code = ANY (allowed_currencies));

-- Align existing orgs: ensure currency_code is in allowed list
UPDATE organizations
SET allowed_currencies = ARRAY[currency_code]::text[]
WHERE NOT (currency_code = ANY (allowed_currencies));

-- Purchase transaction currency
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS currency_code char(3) NOT NULL DEFAULT 'MXN';

ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_currency_supported
    CHECK (currency_code IN ('MXN', 'USD'));

UPDATE purchase_orders po
SET currency_code = o.currency_code
FROM organizations o
WHERE po.organization_id = o.id
  AND po.currency_code = 'MXN'
  AND o.currency_code <> 'MXN';

-- User invitations (invitation-based onboarding)
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  email text NOT NULL,
  role app_role NOT NULL,
  branch_id uuid REFERENCES branches (id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES warehouses (id) ON DELETE SET NULL,
  invited_by uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_invitations_email_not_empty CHECK (char_length(trim(email)) > 0),
  CONSTRAINT user_invitations_status_valid CHECK (
    status IN ('pending', 'accepted', 'revoked', 'expired')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS user_invitations_pending_email_key
  ON user_invitations (organization_id, lower(trim(email)))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS user_invitations_organization_id_idx
  ON user_invitations (organization_id);

CREATE TRIGGER trg_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_invitations_select_org
  ON user_invitations FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

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

-- Update profiles admin policy to use is_org_admin (same body, clearer intent)
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

-- Complete invitation after Supabase Auth signup
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
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'auth_user_not_found';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'profile_already_exists';
  END IF;

  SELECT * INTO v_inv
  FROM user_invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;

  IF lower(trim(v_inv.email)) <> lower(trim(v_user_email)) THEN
    RAISE EXCEPTION 'invitation_email_mismatch';
  END IF;

  INSERT INTO profiles (id, organization_id, branch_id, full_name, role, is_active)
  VALUES (
    auth.uid(),
    v_inv.organization_id,
    v_inv.branch_id,
    split_part(v_user_email, '@', 1),
    v_inv.role,
    true
  );

  UPDATE user_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = p_invitation_id;

  RETURN v_inv.organization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_user_invitation(uuid) TO authenticated;

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
