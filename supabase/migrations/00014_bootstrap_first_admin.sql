-- 00014_bootstrap_first_admin.sql
-- One-time bootstrap for the first organization and admin profile.
-- Run from Supabase SQL Editor after creating the auth user in Authentication.

CREATE OR REPLACE FUNCTION bootstrap_first_admin(
  p_user_id uuid,
  p_full_name text,
  p_organization_name text,
  p_organization_slug text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM organizations LIMIT 1) THEN
    RAISE EXCEPTION 'bootstrap_already_completed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'auth_user_not_found';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'profile_already_exists';
  END IF;

  IF char_length(trim(p_full_name)) = 0 THEN
    RAISE EXCEPTION 'full_name_required';
  END IF;

  IF char_length(trim(p_organization_name)) = 0 THEN
    RAISE EXCEPTION 'organization_name_required';
  END IF;

  IF char_length(trim(p_organization_slug)) = 0 THEN
    RAISE EXCEPTION 'organization_slug_required';
  END IF;

  INSERT INTO organizations (name, slug)
  VALUES (trim(p_organization_name), trim(p_organization_slug))
  RETURNING id INTO v_org_id;

  INSERT INTO profiles (id, organization_id, full_name, role, is_active)
  VALUES (p_user_id, v_org_id, trim(p_full_name), 'admin', true);

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION bootstrap_first_admin(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bootstrap_first_admin(uuid, text, text, text) TO service_role;
