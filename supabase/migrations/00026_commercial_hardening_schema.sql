-- 00026_commercial_hardening_schema.sql
-- Organization settings, extended roles, purchase currency, invitations, AI/WhatsApp config
--
-- NOTE: New app_role enum values are added here but must NOT be referenced in this
-- migration. PostgreSQL forbids using a newly added enum value until the adding
-- transaction commits. Functions/policies/seeds that reference owner/manager/etc.
-- live in 00027_commercial_hardening_permissions.sql.

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

-- Org-scoped read only; admin manage policy added in 00027 after enum values commit.
CREATE POLICY user_invitations_select_org
  ON user_invitations FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- Complete invitation after Supabase Auth signup (role value supplied at runtime)
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
