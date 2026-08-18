-- 00027_commercial_hardening_permissions.sql
-- Granular permissions and role mappings for commercial delivery

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

-- Map legacy admin role to owner permissions if admin exists without owner rows
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', rp.permission_id
FROM role_permissions rp
WHERE rp.role = 'owner'
ON CONFLICT (role, permission_id) DO NOTHING;
