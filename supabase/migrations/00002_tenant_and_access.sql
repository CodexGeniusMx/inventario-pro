-- 00002_tenant_and_access.sql
-- Organizations, branches, profiles, permissions

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  currency_code char(3) NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_not_empty CHECK (char_length(trim(slug)) > 0),
  CONSTRAINT organizations_name_not_empty CHECK (char_length(trim(name)) > 0)
);

CREATE UNIQUE INDEX organizations_slug_key ON organizations (slug);

CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT branches_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT branches_code_not_empty CHECK (char_length(trim(code)) > 0)
);

CREATE UNIQUE INDEX branches_organization_code_key ON branches (organization_id, code);
CREATE INDEX branches_organization_id_idx ON branches (organization_id);

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  branch_id uuid REFERENCES branches (id) ON DELETE SET NULL,
  full_name text NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_full_name_not_empty CHECK (char_length(trim(full_name)) > 0)
);

CREATE INDEX profiles_organization_id_idx ON profiles (organization_id);
CREATE INDEX profiles_organization_role_idx ON profiles (organization_id, role);
CREATE INDEX profiles_branch_id_idx ON profiles (branch_id);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource text NOT NULL,
  action text NOT NULL,
  CONSTRAINT permissions_resource_not_empty CHECK (char_length(trim(resource)) > 0),
  CONSTRAINT permissions_action_not_empty CHECK (char_length(trim(action)) > 0),
  CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action)
);

CREATE TABLE role_permissions (
  role app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
