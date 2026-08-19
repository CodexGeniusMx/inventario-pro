# Phase 0 — Trust & Security Hardening Report

**Date:** 2026-08-19  
**Scope:** Trust foundation only (no Phase 1 features)  
**Migration:** `00029_phase0_trust_hardening.sql` (apply after 00001–00028)

---

## 1. Files changed

### New files
| File | Purpose |
|------|---------|
| `supabase/migrations/00029_phase0_trust_hardening.sql` | Profile protection, RLS alignment, audit RPC, atomic PO, invitation warehouse |
| `lib/audit/types.ts` | Audit source/types |
| `lib/audit/audit.service.ts` | Centralized audit writer |
| `lib/auth/financial-data.ts` | Cost/profit payload stripping helpers |
| `tests/unit/financial-data.test.ts` | Financial gating regression tests |
| `tests/security/cross-tenant-requirements.test.ts` | Integration harness requirements |
| `docs/security.md` | Security architecture documentation |
| `docs/phase-0-trust-hardening-report.md` | This report |

### Modified files
| File | Change |
|------|--------|
| `services/reporting/report.service.ts` | Strip cost/profit in reports |
| `services/reporting/dashboard.service.ts` | Granular financial visibility |
| `services/purchasing/purchase.service.ts` | Atomic RPC create; cost stripping |
| `services/catalog/product.service.ts` | Audit on product mutations |
| `app/(app)/reports/[slug]/page.tsx` | Conditional cost/profit columns |
| `app/api/reports/[slug]/export/route.ts` | Conditional export + audit |
| `app/(app)/dashboard/page.tsx` | Conditional metrics |
| `app/(app)/purchases/new/page.tsx` | `purchases:create` instead of `requireAdmin()` |
| `app/(app)/purchases/page.tsx` | Granular create permission for UI |
| `app/actions/purchases.ts` | Granular create permission |
| `app/dev/testing/page.tsx` | `requireAdmin()` gate |
| `lib/purchasing/rpc.ts` | `CreatePurchaseOrderRpcArgs` |
| `lib/database.types.ts` | New RPC/column types |
| `tests/setup/factories.ts` | `read_only` includes `reports:read` |
| `types/dashboard.ts` | `canViewInventoryValue`, `canViewProfit` |
| `docs/enterprise-readiness-audit.md` | Phase 0 status update |
| `docs/workflow-registry.md` | Phase 0 status update |
| `docs/enterprise-roadmap.md` | Phase 0 completion note |

---

## 2. New migration(s)

**`00029_phase0_trust_hardening.sql`**

| Component | Description |
|-----------|-------------|
| `profiles.default_warehouse_id` | Stores invited warehouse assignment |
| `protect_profile_privileged_columns` trigger | Blocks self-update of role/org/state/branch/warehouse |
| `audit_logs.source` column | Tracks mutation source |
| `insert_audit_log()` | SECURITY DEFINER centralized writer |
| `audit_profile_privileged_change` trigger | Audits admin profile changes |
| RLS helpers | `can_write_products`, `can_write_categories`, etc. |
| RLS policy updates | Catalog, suppliers, warehouses, POs, branches, audit read |
| `create_purchase_order()` | Atomic header + lines + audit |
| `complete_user_invitation()` | Applies `warehouse_id` → `default_warehouse_id` |

**Safe to apply:** Yes, assuming 00001–00028 are applied. Review in staging first. No destructive data changes except additive schema.

---

## 3. Profile self-escalation result

| | Before | After |
|---|--------|-------|
| **Policy** | `profiles_update_self` allows any column change where `id = auth.uid()` | Same policy; privileged columns blocked by **BEFORE UPDATE trigger** |
| **Exploit** | `UPDATE profiles SET role = 'owner' WHERE id = auth.uid()` — **EXPLOITABLE** | Trigger raises `profile_privileged_self_update_denied` — **IMPLEMENTED** |
| **Safe self-edit** | Unrestricted | `full_name` (and non-privileged fields) only |
| **Live verification** | N/A | **NOT YET VERIFIED** (needs Supabase integration harness) |

---

## 4. RLS mismatches fixed

| Table / Operation | App permission | RLS before | RLS after (00029) |
|-------------------|----------------|------------|-------------------|
| products INSERT/UPDATE | `products:create/edit` | `is_admin()` | `can_write_products()` |
| product_variants | same | `is_admin()` | `can_write_products()` |
| categories | `categories:write` | `is_admin()` | `can_write_categories()` |
| suppliers | `suppliers:create/edit` | `is_admin()` | `can_write_suppliers()` |
| warehouses | `settings:inventory` | `is_admin()` | `can_write_warehouses()` |
| branches | `settings:company` | `is_admin()` | `can_manage_branches()` |
| purchase_orders | `purchases:create/write` | `is_admin()` | `can_write_purchase_orders()` |
| purchase_order_items | same | `is_admin()` | via PO policy |
| variant_reorder_points | `products:edit` or `inventory:adjust` | `is_admin()` | combined check |
| audit_logs SELECT | `audit:read` | `is_admin()` | `can_read_audit_logs()` |
| organization_units | already aligned in 00028 | — | unchanged |

---

## 5. Financial / cost leaks fixed

| Path | Fix |
|------|-----|
| `getInventoryReport()` | Zeros `unitCost` / `inventoryValue` without cost permission |
| `getSalesReport()` summary | Zeros COGS/profit without `financial:profit` |
| `getPurchaseReport()` | Zeros totals without cost permission |
| Dashboard `inventoryValue` | Only computed when `canViewProductCosts` |
| Dashboard gross profit | Only when `financial:profit` |
| Reports UI / CSV export | Conditional columns |
| PO list/detail services | Cost fields zeroed/stripped |
| Seller dashboard | No inventory value card with cost subtitle |

**Regression tests:** `tests/unit/financial-data.test.ts`

---

## 6. Audit logging implementation

| Event | Mechanism | Transactional? |
|-------|-----------|----------------|
| Profile privileged change | DB trigger | Yes (same transaction as UPDATE) |
| Invitation accepted | `complete_user_invitation` RPC | Yes |
| PO create | `create_purchase_order` RPC | Yes |
| Product create/update/archive/reactivate | `writeAuditLog()` in service | **Best-effort** |
| Sensitive report export | `writeAuditLog()` in export route | **Best-effort** |

**Remaining best-effort (documented):** Product service mutations, export audit — failure logs to console but does not roll back business change. Sales/receiving/adjustments audit in RPC — **PLANNED** next migration.

---

## 7. PO atomicity result

| Before | After |
|--------|-------|
| Header INSERT + items INSERT + manual DELETE on failure | Single `create_purchase_order()` RPC transaction |
| Partial state possible (header without lines) | All-or-nothing |
| No audit on create | Audit in same transaction |

Service: `purchase.service.ts` now calls RPC only.

---

## 8. Invitation warehouse assignment result

| | Status |
|---|--------|
| **Before** | `user_invitations.warehouse_id` stored but `complete_user_invitation` ignored it |
| **After** | `profiles.default_warehouse_id` column + RPC sets from invitation |
| **Verification** | **CONFIRMED GAP FIXED in code** — **NOT YET VERIFIED** on live DB |

---

## 9. Development route security result

| Control | Status |
|---------|--------|
| `/dev/*` → 404 in production | **IMPLEMENTED** (middleware) |
| `/dev/testing` requires admin in development | **IMPLEMENTED** (Phase 0) |
| Sidebar dev link dev-only | **IMPLEMENTED** (unchanged) |

---

## 10. Tests added

| File | Tests |
|------|-------|
| `tests/unit/financial-data.test.ts` | 4 |
| `tests/security/cross-tenant-requirements.test.ts` | 5 |

---

## 11. Tests actually executed

```
npx tsc --noEmit          PASS
npm run build             PASS
npx vitest run            241 passed, 4 skipped
```

**Supabase integration tests:** NOT RUN (harness disabled by default).

---

## 12. Requires real Supabase integration testing

- Profile self-escalation UPDATE rejection
- Cross-tenant SELECT/UPDATE on all entity types
- Manager role catalog write via JWT (RLS)
- `create_purchase_order` rollback under injected failure
- `insert_audit_log` tenant isolation
- Invitation `warehouse_id` → profile column
- Audit immutability under direct client INSERT attempt

Enable with: `KEEP_INVENTORY_INTEGRATION_TESTS=true`, `KEEP_INVENTORY_TEST_ORG_ID`, `KEEP_INVENTORY_ALLOW_REMOTE_TESTS=true`.

---

## 13. Manual QA checklist

- [ ] Apply `00029` on staging Supabase
- [ ] As seller: attempt profile role change via Supabase SQL editor → expect error
- [ ] As manager: create/edit product → expect success (RLS)
- [ ] As read_only: open inventory report → no cost columns in UI or CSV
- [ ] As read_only: sales report → no COGS/profit
- [ ] As manager: create PO with 3 lines → verify all lines present
- [ ] Accept invitation with warehouse → verify `profiles.default_warehouse_id`
- [ ] As seller in dev: `/dev/testing` → redirect to dashboard
- [ ] Query `audit_logs` after product create and PO create

---

## 14. Risks remaining

1. **Integration tests not run** — RLS/trigger behavior unverified on live Postgres
2. **Product audit best-effort** — mutation could commit without audit row
3. **Legacy permission aliases** — `purchases:write` vs `purchases:create` both accepted; consolidate later
4. **v_inventory_status exposes cost_price at view level** — mitigated by service stripping; view-level RLS by permission **PLANNED**
5. **Rate limiting / MFA** — not in Phase 0 scope

---

## 15. Migrations safe to apply?

**Yes**, with standard precautions:
- Additive schema (`default_warehouse_id`, `audit_logs.source`)
- Policy replacements (no data deletion)
- Function replacements (CREATE OR REPLACE)
- Test on staging before production

**Do not** run `supabase db push` automatically — manual review requested.

---

## Specialist sign-off (agency-agents perspectives)

| Role | Phase 0 outcome |
|------|-----------------|
| **Security Engineer** | Profile escalation closed at DB layer; cost gating enforced server-side |
| **Backend Architect** | PO atomicity aligned with sale RPC pattern; audit writer centralized |
| **Database Specialist** | RLS helpers reduce admin-only drift; triggers reviewed for SECURITY DEFINER |
| **QA / API Tester** | Unit tests added; integration harness requirements documented |
| **Reality Checker** | Integration tests NOT claimed as passed |
| **Code Reviewer** | Scope limited to trust items; no Phase 1 features introduced |

**STOP:** Awaiting manual review. No commit, push, or db push performed.
