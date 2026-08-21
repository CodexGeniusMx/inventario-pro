-- 00032_user_preferences_and_role_permission_editor.sql
-- Phase 1A: per-user preferences + organization-scoped role permission overrides.

-- ---------------------------------------------------------------------------
-- 1. User preferences (personal, not organization configuration)
-- ---------------------------------------------------------------------------

CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  theme text NOT NULL DEFAULT 'system'
    CONSTRAINT user_preferences_theme_check
    CHECK (theme IN ('light', 'dark', 'system')),
  density text NOT NULL DEFAULT 'normal'
    CONSTRAINT user_preferences_density_check
    CHECK (density IN ('compact', 'normal', 'comfortable')),
  text_size text NOT NULL DEFAULT 'normal'
    CONSTRAINT user_preferences_text_size_check
    CHECK (text_size IN ('normal', 'large')),
  reduce_motion boolean NOT NULL DEFAULT false,
  high_contrast boolean NOT NULL DEFAULT false,
  notifications_in_app boolean NOT NULL DEFAULT true,
  notifications_email_enabled boolean NOT NULL DEFAULT false,
  notifications_whatsapp_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_preferences_organization_id_idx
  ON user_preferences (organization_id);

CREATE OR REPLACE FUNCTION validate_user_preferences_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.organization_id <> (
    SELECT organization_id FROM profiles WHERE id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'user_preferences_org_mismatch';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER user_preferences_validate_org
  BEFORE INSERT OR UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_preferences_org();

CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_preferences_select_own
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_preferences_insert_own
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY user_preferences_update_own
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = get_user_organization_id()
  );

GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Organization-scoped role permission overrides
-- ---------------------------------------------------------------------------

CREATE TABLE organization_role_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  role app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  granted boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_role_permission_overrides_unique
    UNIQUE (organization_id, role, permission_id)
);

CREATE INDEX organization_role_permission_overrides_org_role_idx
  ON organization_role_permission_overrides (organization_id, role);

ALTER TABLE organization_role_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Read for permission editors in the same organization.
CREATE POLICY organization_role_permission_overrides_select
  ON organization_role_permission_overrides FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND can_manage_role_permissions()
  );

-- Writes only via SECURITY DEFINER RPC (deny direct client mutations).
CREATE POLICY organization_role_permission_overrides_deny_insert
  ON organization_role_permission_overrides FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY organization_role_permission_overrides_deny_update
  ON organization_role_permission_overrides FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY organization_role_permission_overrides_deny_delete
  ON organization_role_permission_overrides FOR DELETE
  TO authenticated
  USING (false);

GRANT SELECT ON organization_role_permission_overrides TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Effective permission resolution (org override → global default)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION role_has_default_permission(
  p_role app_role,
  p_permission_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role = p_role
      AND rp.permission_id = p_permission_id
  );
$$;

CREATE OR REPLACE FUNCTION effective_role_permission_granted(
  p_organization_id uuid,
  p_role app_role,
  p_permission_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT orpo.granted
      FROM organization_role_permission_overrides orpo
      WHERE orpo.organization_id = p_organization_id
        AND orpo.role = p_role
        AND orpo.permission_id = p_permission_id
    ),
    role_has_default_permission(p_role, p_permission_id)
  );
$$;

CREATE OR REPLACE FUNCTION has_permission(
  p_resource text,
  p_action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles pr
    JOIN permissions p
      ON p.resource = p_resource
      AND p.action = p_action
    WHERE pr.id = auth.uid()
      AND pr.is_active = true
      AND effective_role_permission_granted(
        pr.organization_id,
        pr.role,
        p.id
      )
  );
$$;

CREATE OR REPLACE FUNCTION get_effective_permissions_for_role(
  p_organization_id uuid,
  p_role app_role
)
RETURNS TABLE (
  permission_id uuid,
  resource text,
  action text,
  granted boolean,
  is_override boolean,
  is_default boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS permission_id,
    p.resource,
    p.action,
    effective_role_permission_granted(p_organization_id, p_role, p.id) AS granted,
    EXISTS (
      SELECT 1
      FROM organization_role_permission_overrides orpo
      WHERE orpo.organization_id = p_organization_id
        AND orpo.role = p_role
        AND orpo.permission_id = p.id
    ) AS is_override,
    role_has_default_permission(p_role, p.id) AS is_default
  FROM permissions p
  ORDER BY p.resource, p.action;
$$;

CREATE OR REPLACE FUNCTION get_my_effective_permissions()
RETURNS TABLE (resource text, action text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.resource, p.action
  FROM profiles pr
  JOIN permissions p ON true
  WHERE pr.id = auth.uid()
    AND pr.is_active = true
    AND effective_role_permission_granted(pr.organization_id, pr.role, p.id);
$$;

GRANT EXECUTE ON FUNCTION get_effective_permissions_for_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_effective_permissions() TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Protected permissions (owner role immutable; admin safeguards)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_protected_role_permission(
  p_role app_role,
  p_resource text,
  p_action text,
  p_granted boolean
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Owner role matrix is not editable.
  IF p_role = 'owner' THEN
    RETURN true;
  END IF;

  -- Admin must retain permission management capability.
  IF p_role = 'admin'
    AND p_resource = 'roles'
    AND p_action = 'manage_permissions'
    AND p_granted = false THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Upsert / restore organization role permissions (RPC)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION upsert_user_preferences(
  p_theme text DEFAULT NULL,
  p_density text DEFAULT NULL,
  p_text_size text DEFAULT NULL,
  p_reduce_motion boolean DEFAULT NULL,
  p_high_contrast boolean DEFAULT NULL,
  p_notifications_in_app boolean DEFAULT NULL,
  p_notifications_email_enabled boolean DEFAULT NULL,
  p_notifications_whatsapp_enabled boolean DEFAULT NULL
)
RETURNS user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid := get_user_organization_id();
  v_row user_preferences%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  INSERT INTO user_preferences (
    user_id,
    organization_id,
    theme,
    density,
    text_size,
    reduce_motion,
    high_contrast,
    notifications_in_app,
    notifications_email_enabled,
    notifications_whatsapp_enabled
  )
  VALUES (
    v_user_id,
    v_org_id,
    COALESCE(p_theme, 'system'),
    COALESCE(p_density, 'normal'),
    COALESCE(p_text_size, 'normal'),
    COALESCE(p_reduce_motion, false),
    COALESCE(p_high_contrast, false),
    COALESCE(p_notifications_in_app, true),
    COALESCE(p_notifications_email_enabled, false),
    COALESCE(p_notifications_whatsapp_enabled, false)
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    theme = COALESCE(p_theme, user_preferences.theme),
    density = COALESCE(p_density, user_preferences.density),
    text_size = COALESCE(p_text_size, user_preferences.text_size),
    reduce_motion = COALESCE(p_reduce_motion, user_preferences.reduce_motion),
    high_contrast = COALESCE(p_high_contrast, user_preferences.high_contrast),
    notifications_in_app = COALESCE(p_notifications_in_app, user_preferences.notifications_in_app),
    notifications_email_enabled = COALESCE(
      p_notifications_email_enabled,
      user_preferences.notifications_email_enabled
    ),
    notifications_whatsapp_enabled = COALESCE(
      p_notifications_whatsapp_enabled,
      user_preferences.notifications_whatsapp_enabled
    ),
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION get_or_create_user_preferences()
RETURNS user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid := get_user_organization_id();
  v_row user_preferences%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  SELECT * INTO v_row
  FROM user_preferences
  WHERE user_id = v_user_id;

  IF FOUND THEN
    RETURN v_row;
  END IF;

  INSERT INTO user_preferences (user_id, organization_id)
  VALUES (v_user_id, v_org_id)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION update_organization_role_permissions(
  p_role app_role,
  p_changes jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := get_user_organization_id();
  v_actor uuid := auth.uid();
  v_change jsonb;
  v_permission_id uuid;
  v_granted boolean;
  v_resource text;
  v_action text;
  v_before boolean;
  v_after boolean;
  v_applied integer := 0;
  v_audit_entries jsonb := '[]'::jsonb;
BEGIN
  IF v_org_id IS NULL OR v_actor IS NULL THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF NOT can_manage_role_permissions() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'owner_role_immutable';
  END IF;

  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'array' THEN
    RAISE EXCEPTION 'invalid_changes_payload';
  END IF;

  FOR v_change IN SELECT value FROM jsonb_array_elements(p_changes)
  LOOP
    v_permission_id := (v_change ->> 'permission_id')::uuid;
    v_granted := COALESCE((v_change ->> 'granted')::boolean, false);

    SELECT p.resource, p.action
    INTO v_resource, v_action
    FROM permissions p
    WHERE p.id = v_permission_id;

    IF v_resource IS NULL THEN
      RAISE EXCEPTION 'unknown_permission';
    END IF;

    IF is_protected_role_permission(p_role, v_resource, v_action, v_granted) THEN
      RAISE EXCEPTION 'protected_permission';
    END IF;

    v_before := effective_role_permission_granted(v_org_id, p_role, v_permission_id);

    IF v_before = v_granted THEN
      DELETE FROM organization_role_permission_overrides
      WHERE organization_id = v_org_id
        AND role = p_role
        AND permission_id = v_permission_id
        AND role_has_default_permission(p_role, v_permission_id) = v_granted;
    ELSE
      IF role_has_default_permission(p_role, v_permission_id) = v_granted THEN
        DELETE FROM organization_role_permission_overrides
        WHERE organization_id = v_org_id
          AND role = p_role
          AND permission_id = v_permission_id;
      ELSE
        INSERT INTO organization_role_permission_overrides (
          organization_id,
          role,
          permission_id,
          granted
        )
        VALUES (v_org_id, p_role, v_permission_id, v_granted)
        ON CONFLICT (organization_id, role, permission_id)
        DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
      END IF;
    END IF;

    v_after := effective_role_permission_granted(v_org_id, p_role, v_permission_id);

    IF v_before IS DISTINCT FROM v_after THEN
      v_applied := v_applied + 1;
      v_audit_entries := v_audit_entries || jsonb_build_object(
        'resource', v_resource,
        'action', v_action,
        'before', v_before,
        'after', v_after
      );
    END IF;
  END LOOP;

  IF v_applied > 0 THEN
    PERFORM audit_log_record(
      v_org_id,
      v_actor,
      'role_permission.update',
      'role_permission',
      NULL,
      jsonb_build_object('role', p_role, 'changes', v_audit_entries),
      jsonb_build_object('role', p_role, 'applied', v_applied),
      'ui'
    );
  END IF;

  RETURN jsonb_build_object('applied', v_applied, 'role', p_role);
END;
$$;

CREATE OR REPLACE FUNCTION restore_organization_role_permissions(
  p_role app_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := get_user_organization_id();
  v_actor uuid := auth.uid();
  v_deleted integer;
BEGIN
  IF v_org_id IS NULL OR v_actor IS NULL THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF NOT can_manage_role_permissions() THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'owner_role_immutable';
  END IF;

  DELETE FROM organization_role_permission_overrides
  WHERE organization_id = v_org_id
    AND role = p_role;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    PERFORM audit_log_record(
      v_org_id,
      v_actor,
      'role_permission.restore_defaults',
      'role_permission',
      NULL,
      jsonb_build_object('role', p_role, 'removed_overrides', v_deleted),
      jsonb_build_object('role', p_role),
      'ui'
    );
  END IF;

  RETURN jsonb_build_object('removed_overrides', v_deleted, 'role', p_role);
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_user_preferences(
  text, text, text, boolean, boolean, boolean, boolean, boolean
) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION update_organization_role_permissions(app_role, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_organization_role_permissions(app_role) TO authenticated;
