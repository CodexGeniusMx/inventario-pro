-- Keep Inventory — DEVELOPMENT ONLY data reset
-- DO NOT RUN IN PRODUCTION
--
-- Verified execution script: scripts/dev-reset-execute.sql
-- Organization: query profiles JOIN organizations first to confirm target org.

-- Example identification query:
-- SELECT p.organization_id, o.name, p.full_name, p.role
-- FROM profiles p JOIN organizations o ON o.id = p.organization_id;

-- See scripts/dev-reset-execute.sql for the FK-safe script that:
-- 1. Temporarily disables inventory_movements delete trigger (dev only)
-- 2. Clears circular movement FKs
-- 3. Deletes business data scoped to one organization
-- 4. Preserves warehouses (default warehouse kept)
-- 5. Resets document_sequences last_value to 0
