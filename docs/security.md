# Keep Inventory — Security Architecture

**Last updated:** 2026-08-19 (Phase 0 trust hardening)  
**Status labels:** **IMPLEMENTED** · **PLANNED** · **NOT YET VERIFIED**

---

## 1. Authentication

| Control | Status |
|---------|--------|
| Supabase Auth (email/password) | **IMPLEMENTED** |
| SSR cookie session via `@supabase/ssr` | **IMPLEMENTED** |
| Middleware session refresh | **IMPLEMENTED** |
| Inactive users blocked at session load | **IMPLEMENTED** |
| 2FA / MFA | **PLANNED** |
| Account lockout after failed attempts | **PLANNED** |

Sessions use Supabase-issued JWTs stored in HTTP-only cookies. The application does not implement custom JWT signing. Refresh behavior follows Supabase Auth defaults (**IMPLEMENTED** at architectural level; token TTL tuning **PLANNED**).

---

## 2. Tenant isolation

| Control | Status |
|---------|--------|
| `profiles.organization_id` tenant anchor | **IMPLEMENTED** |
| All business tables scoped by `organization_id` | **IMPLEMENTED** |
| RLS enabled on tenant tables | **IMPLEMENTED** |
| `get_user_organization_id()` SECURITY DEFINER helper | **IMPLEMENTED** |
| RPC `assert_same_organization()` | **IMPLEMENTED** |
| Cross-tenant integration test harness | **PLANNED** (requirements documented in `tests/security/`) |

---

## 3. Authorization model

### 3.1 Roles (seed)

Roles: `owner`, `admin`, `manager`, `seller`, `warehouse`, `read_only` (+ legacy `employee`).  
Seed: migration `00027_commercial_hardening_permissions.sql`.

### 3.2 Granular permissions

Permissions are `(resource, action)` pairs in `permissions` / `role_permissions`.  
Application checks: `lib/auth/permissions.ts`, `lib/auth/product-permissions.ts`.  
Database checks: `has_permission(resource, action)` (**IMPLEMENTED**).

### 3.3 RLS alignment (Phase 0)

Migration `00029_phase0_trust_hardening.sql` replaces legacy `is_admin()`-only write policies with helpers:

| Helper | Used for |
|--------|----------|
| `can_write_products()` | products, product_variants |
| `can_write_categories()` | categories |
| `can_write_suppliers()` | suppliers |
| `can_write_warehouses()` | warehouses |
| `can_write_purchase_orders()` | purchase_orders, purchase_order_items |
| `can_manage_branches()` | branches |
| `can_read_audit_logs()` | audit_logs SELECT |

Direct inventory mutations remain RPC-only (**IMPLEMENTED**).

---

## 4. Profile security

| Control | Status |
|---------|--------|
| Self-update policy (`profiles_update_self`) for own row | **IMPLEMENTED** |
| Trigger blocks self-change of `role`, `organization_id`, `is_active`, `branch_id`, `default_warehouse_id` | **IMPLEMENTED** (`00029`) |
| Admin/user-management policy for privileged updates | **IMPLEMENTED** |
| Profile privileged-change audit trigger | **IMPLEMENTED** |
| Exploitability verification on live DB | **NOT YET VERIFIED** (requires integration harness) |

**Before Phase 0:** A seller could run `UPDATE profiles SET role = 'owner' WHERE id = auth.uid()` — **CONFIRMED EXPLOITABLE** from policy analysis.  
**After Phase 0:** Trigger raises `profile_privileged_self_update_denied` — **IMPLEMENTED** (pending live verification).

Safe self-edit fields: `full_name` (and timestamps via trigger).

---

## 5. Financial / cost data

Sensitive fields: acquisition cost, unit cost, inventory value, COGS, gross profit, PO totals.

| Path | Gating | Status |
|------|--------|--------|
| Product list/detail services | `canViewProductCosts` | **IMPLEMENTED** |
| Inventory report / export | `products:view_cost` / `financial:costs` | **IMPLEMENTED** (Phase 0) |
| Sales report COGS/profit | `financial:profit` | **IMPLEMENTED** (Phase 0) |
| Dashboard inventory value | `canViewProductCosts` | **IMPLEMENTED** (Phase 0) |
| Dashboard gross profit | `financial:profit` | **IMPLEMENTED** (Phase 0) |
| Purchase order costs | `canViewProductCosts` | **IMPLEMENTED** (Phase 0) |
| Keep AI cost tools | permission checks in executor | **IMPLEMENTED** |

UI hiding alone is insufficient; server payloads are stripped in `lib/auth/financial-data.ts` and services.

---

## 6. Server trust boundary

| Pattern | Status |
|---------|--------|
| Server Actions as primary mutation path | **IMPLEMENTED** |
| `requireUser()` / `requirePermission()` guards | **IMPLEMENTED** |
| Prices resolved server-side for sales | **IMPLEMENTED** (`create_and_complete_sale`) |
| Purchase order create via atomic RPC | **IMPLEMENTED** (`create_purchase_order`, `00029`) |
| Service role key server-only | **IMPLEMENTED** (never exposed to client) |
| API routes minimal surface (reports export, Keep AI) | **IMPLEMENTED** |

---

## 7. SECURITY DEFINER functions

RPCs and helpers use `SECURITY DEFINER` with `SET search_path = public`. Inventory/sales/purchase RPCs set `row_security = off` and enforce permissions internally.

Rules:
- Always call `assert_same_organization()` for org-scoped RPCs
- Never trust client-supplied org id without verification
- Permission checks via `has_permission()` or dedicated helpers

New in Phase 0:
- `insert_audit_log()` — centralized audit writer
- `create_purchase_order()` — atomic PO creation

---

## 8. Audit logging

| Control | Status |
|---------|--------|
| `audit_logs` table with immutability triggers | **IMPLEMENTED** |
| `insert_audit_log()` SECURITY DEFINER RPC | **IMPLEMENTED** (`00029`) |
| App writer `lib/audit/audit.service.ts` | **IMPLEMENTED** |
| Product create/update/archive/reactivate | **IMPLEMENTED** (best-effort, not transactional) |
| PO create | **IMPLEMENTED** (transactional in RPC) |
| Profile privileged changes | **IMPLEMENTED** (DB trigger) |
| Invitation acceptance | **IMPLEMENTED** (RPC) |
| Sensitive report export | **IMPLEMENTED** |
| Sales / receiving / stock adjustments | **PLANNED** (RPC coupling in future migration) |
| Audit Log UI | **PLANNED** |

Sources supported: `ui`, `keep_ai`, `import`, `api`, `whatsapp`, `automation`.

Secrets and unnecessary PII must not be logged (**IMPLEMENTED** sanitizer in audit service).

---

## 9. Keep AI trust boundary

| Control | Status |
|---------|--------|
| Read-only tools with permission checks | **IMPLEMENTED** |
| Mutations require confirmation | **IMPLEMENTED** (UI) |
| Actual mutation execution | **NOT IMPLEMENTED** (preview stub) |
| Cost/profit tools respect permissions | **IMPLEMENTED** |

Keep AI must not bypass service-layer authorization (**IMPLEMENTED** design; ongoing review **PLANNED**).

---

## 10. Exports and imports

| Control | Status |
|---------|--------|
| Report CSV export requires `reports:read` | **IMPLEMENTED** |
| Cost columns omitted without cost permissions | **IMPLEMENTED** |
| Sensitive export audit event | **IMPLEMENTED** |
| Excel/CSV import | **PLANNED** (future boundary: server validation + audit source `import`) |

---

## 11. External integrations (future)

| Integration | Status |
|-------------|--------|
| n8n automation | **PLANNED** — must not be inventory source of truth |
| WhatsApp | **PLANNED** — notifications/queries only via secured APIs |

---

## 12. Development routes

| Control | Status |
|---------|--------|
| `/dev/*` blocked in production (`middleware.ts`) | **IMPLEMENTED** |
| Dev page requires `requireAdmin()` in development | **IMPLEMENTED** (Phase 0) |
| Dev link hidden outside development | **IMPLEMENTED** (sidebar) |

---

## 13. Invitations

| Control | Status |
|---------|--------|
| Invitation email match enforced in RPC | **IMPLEMENTED** |
| Role assigned from invitation | **IMPLEMENTED** |
| `warehouse_id` → `profiles.default_warehouse_id` | **IMPLEMENTED** (`00029`) — **NOT YET VERIFIED** on live DB |

---

## 14. Account security roadmap

- MFA / 2FA — **PLANNED**
- Rate limiting (auth, API, Keep AI) — **PLANNED**
- Session revocation admin tools — **PLANNED**
- Custom roles UI — **PLANNED** (out of Phase 0 scope)

---

## 15. Backup and incident response

| Topic | Status |
|-------|--------|
| Database backups (Supabase) | **IMPLEMENTED** (platform responsibility) |
| Application backup runbook | **PLANNED** (`docs/security.md` operational section TBD) |
| Incident response playbook | **PLANNED** |

**Principles (Phase 0):**
1. Contain — disable affected credentials / org access
2. Preserve — rely on immutable audit_logs and inventory_movements
3. Notify — organization owners per contract
4. Remediate — patch, migrate, verify with integration tests

---

## 16. Threat model (summary)

| Threat | Mitigation |
|--------|------------|
| Cross-tenant data access | RLS + org-scoped services |
| Privilege escalation via profile self-update | DB trigger (`00029`) |
| Cost data leakage to sellers/auditors | Permission-gated services |
| Partial PO creation | Atomic RPC |
| Audit tampering | Immutable audit_logs + no client INSERT policy |
| Service role key exposure | Server-only env vars |
| Dev/QA tool exposure in production | Middleware + admin gate |

---

## 17. Verification status

| Check | Status |
|-------|--------|
| `npx tsc --noEmit` | Run after Phase 0 changes |
| `npm run build` | Run after Phase 0 changes |
| Vitest unit/security tests | Run after Phase 0 changes |
| Supabase integration tests | **NOT YET VERIFIED** |

See `docs/phase-0-trust-hardening-report.md` and `docs/phase-0-security-closure-report.md`.

---

## 18. Phase 0 security closure (00030)

Migration `00030_phase0_security_closure.sql` closes remaining gaps after `00029`:

| Control | Mechanism |
|---------|-----------|
| Cross-org profile branch/warehouse | `validate_profile_org_references()` trigger |
| Last owner protection | `protect_last_owner()` trigger |
| DB-level cost disclosure | REVOKE base SELECT; `v_*` views + write triggers |
| Audit forgery | `insert_audit_log()` denied; server uses `audit_log_record()` |
| PO actor spoofing | `create_purchase_order()` derives `created_by` from `auth.uid()` |
| PO retry duplication | Optional `idempotency_key` + unique (organization_id, key) |
| Permission matrix writes | `roles:manage_permissions` + restrictive RLS on `role_permissions` |

**Direct Supabase reads** of `products`, `product_variants`, `purchase_orders`, and related item tables are **denied** to `authenticated`; apps must use `v_*` views for SELECT and base tables for INSERT/UPDATE/DELETE only.

**Live verification:** Required after applying 00030 — see closure report §14–15.
