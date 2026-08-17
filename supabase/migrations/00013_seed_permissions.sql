-- 00013_seed_permissions.sql
-- Permission catalog and MVP role mappings

INSERT INTO permissions (resource, action) VALUES
  ('products', 'read'),
  ('products', 'write'),
  ('categories', 'read'),
  ('categories', 'write'),
  ('inventory', 'read'),
  ('inventory', 'adjust'),
  ('sales', 'read'),
  ('sales', 'write'),
  ('sales', 'complete'),
  ('returns', 'read'),
  ('returns', 'write'),
  ('purchases', 'read'),
  ('purchases', 'write'),
  ('purchases', 'receive'),
  ('suppliers', 'read'),
  ('suppliers', 'write'),
  ('customers', 'read'),
  ('customers', 'write'),
  ('users', 'read'),
  ('users', 'write'),
  ('reports', 'read'),
  ('audit', 'read'),
  ('settings', 'read'),
  ('settings', 'write')
ON CONFLICT (resource, action) DO NOTHING;

-- Admin: all permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', p.id
FROM permissions p
ON CONFLICT (role, permission_id) DO NOTHING;

-- Employee: operational read/write subset
INSERT INTO role_permissions (role, permission_id)
SELECT 'employee', p.id
FROM permissions p
WHERE (p.resource, p.action) IN (
  ('products', 'read'),
  ('categories', 'read'),
  ('inventory', 'read'),
  ('sales', 'read'),
  ('sales', 'write'),
  ('sales', 'complete'),
  ('returns', 'read'),
  ('returns', 'write'),
  ('purchases', 'read'),
  ('suppliers', 'read'),
  ('customers', 'read'),
  ('customers', 'write'),
  ('reports', 'read')
)
ON CONFLICT (role, permission_id) DO NOTHING;
