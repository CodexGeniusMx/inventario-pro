# Phase 0 — Final Security Closure Report

**Date:** 2026-08-19  
**Scope:** Close remaining Phase 0 trust gaps (no Phase 1 features)  
**Migration:** `00030_phase0_security_closure.sql` (apply **after** `00029`)

---

## Verification categories

| Label | Meaning |
|-------|---------|
| **IMPLEMENTED** | Code/migration present in repo |
| **VERIFIED BY CODE** | Static review of logic |
| **VERIFIED BY UNIT TEST** | Passes in `npx vitest run` without live DB |
| **REQUIRES LIVE DB QA** | Needs applied migration + JWT harness |
| **DEFERRED** | Explicitly out of Phase 0 scope |

---

## 1. Files changed (00030 closure)

### New
| File | Purpose |
|------|---------|
| `supabase/migrations/00030_phase0_security_closure.sql` | DB security closure |
| `lib/db/read-models.ts` | READ vs WRITE table constants |
| `lib/db/variant-meta.ts` | Permission-aware variant display helper |
| `tests/security/phase0-security-closure.test.ts` | Closure permission/regression tests |
| `docs/phase-0-security-closure-report.md` | This report |

### Modified (high level)
| Area | Change |
|------|--------|
| Catalog / inventory / sales / returns / purchases / reports / dashboard / search / Keep AI | SELECT via `v_*` views; split queries where embeds broke |
| `lib/audit/audit.service.ts` | Service role + `audit_log_record` |
| `lib/auth/permissions.ts` | `canManageRolePermissions()` |
| `components/purchases/purchase-order-form.tsx` | Stable client idempotency key |
| `types/purchasing.ts`, `lib/purchasing/rpc.ts`, purchase schema | Idempotency + optional `p_created_by` |
| `docs/security.md`, audit/roadmap/registry docs | Phase 0 closure status |

---

## 2. Migration 00030 summary

| Component | Status |
|-----------|--------|
| `can_view_product_costs()`, `can_view_financial_profit()`, `can_manage_role_permissions()` | IMPLEMENTED |
| Seed `roles:manage_permissions` (owner/admin only) | IMPLEMENTED |
| `validate_profile_org_references()` on profiles | IMPLEMENTED |
| `protect_last_owner()` on profiles | IMPLEMENTED |
| Cost write triggers on products / product_variants | IMPLEMENTED |
| `audit_log_record()` (service_role) + deny stub `insert_audit_log()` | IMPLEMENTED |
| Permission-aware views + REVOKE base SELECT | IMPLEMENTED |
| `report_sales_summary` profit masking | IMPLEMENTED |
| `create_purchase_order` actor + idempotency | IMPLEMENTED |
| Restrictive RLS on `role_permissions` client writes | IMPLEMENTED |
| `complete_user_invitation` branch org validation | IMPLEMENTED |

**Do not modify 00001–00029.** Apply 00030 only after 00029.

---

## 3. Cross-org branch / warehouse

| | Before 00030 | After 00030 |
|---|--------------|-------------|
| Profile `branch_id` / `default_warehouse_id` | FK only — cross-org possible | `validate_profile_org_references()` — **IMPLEMENTED** |
| Invitation warehouse | Partial (00029) | Branch + warehouse org match on accept — **IMPLEMENTED** |
| Live JWT test | REQUIRES LIVE DB QA | REQUIRES LIVE DB QA |

---

## 4. PO `created_by` spoofing

| Caller | Model |
|--------|-------|
| Authenticated JWT | `created_by = auth.uid()`; mismatch → `created_by_spoof_denied` |
| Service role (no JWT) | Must pass valid `p_created_by` in org |

App no longer sends `p_created_by` for human sessions — **IMPLEMENTED**.

---

## 5. Cost protection architecture

**Pattern:** REVOKE direct SELECT on cost-bearing base tables; expose `security_invoker` views that NULL cost columns when `can_view_product_costs()` is false.

| Surface | Protection |
|---------|------------|
| Direct Supabase SELECT on `products`, `product_variants`, PO tables | REVOKED — **IMPLEMENTED** (live) |
| App services | Query `v_*` views — **IMPLEMENTED** |
| Cost writes without permission | DB triggers preserve existing cost — **IMPLEMENTED** |
| `v_completed_sale_lines` | REVOKED from authenticated — **IMPLEMENTED** |
| `report_sales_summary` | Masks COGS/profit — **IMPLEMENTED** |

**Residual:** Column-level masking in views still evaluates per-session permission; RLS on underlying rows remains required. **VERIFIED BY CODE**.

---

## 6. Product variant cost leak

| | Before | After |
|---|--------|-------|
| `mapVariantRow` / product detail | Always exposed `costPrice` | NULL when `!canViewProductCosts` — **IMPLEMENTED** |
| Direct DB SELECT | Leaked | Blocked via views — **REQUIRES LIVE DB QA** |

---

## 7. Dashboard purchase financial leak

| | Before | After |
|---|--------|-------|
| Recent purchase `total` | Always shown | Gated by `canViewPurchaseFinancials` + view masking — **IMPLEMENTED** |

---

## 8. Audit integrity

| | Before | After |
|---|--------|-------|
| `insert_audit_log()` | Callable by authenticated — fake events | Deny stub — **IMPLEMENTED** |
| Server mutations | Client RPC | `audit_log_record` via service role — **IMPLEMENTED** |
| Trusted RPCs / triggers | N/A | Call `audit_log_record` internally — **IMPLEMENTED** |
| UPDATE/DELETE audit rows | Possible if RLS weak | Unchanged — rely on existing RLS read-only for clients |

Product mutations: best-effort server audit (non-transactional with mutation) — **documented**; Phase 1 may co-locate in RPC.

---

## 9. PO idempotency

| | Status |
|---|--------|
| Column `purchase_orders.idempotency_key` + unique (org, key) | IMPLEMENTED |
| RPC returns existing PO on duplicate key | IMPLEMENTED |
| Client stable key (form `useRef`) | IMPLEMENTED |
| Concurrency | Unique index + pre-insert lookup — **VERIFIED BY CODE** |
| Live retry test | REQUIRES LIVE DB QA |

---

## 10. Permission management foundation

| Item | Status |
|------|--------|
| Permission `roles:manage_permissions` seeded owner/admin | IMPLEMENTED |
| `canManageRolePermissions()` helper | IMPLEMENTED |
| Client writes to `role_permissions` denied | IMPLEMENTED (restrictive policies) |
| Permission editor UI | DEFERRED (Phase 1) |

**Phase 1 guidance:** All matrix edits via SECURITY DEFINER RPC; audit each change; never expose raw `role_permissions` writes to JWT clients.

---

## 11. Owner lockout protection

| Invariant | Status |
|-----------|--------|
| Cannot demote/deactivate last active owner | `protect_last_owner()` — IMPLEMENTED |
| Onboarding unchanged | VERIFIED BY CODE |
| Live test | REQUIRES LIVE DB QA |

---

## 12. Direct Supabase attack review

Attacker: valid **Seller** JWT in Org A.

| # | Attack | Before 00030 | After 00030 |
|---|--------|--------------|-------------|
| 1 | Self-promote `role=owner` | Blocked (00029 trigger) | Blocked |
| 2 | Assign Org B warehouse | **Allowed** | `profile_warehouse_organization_mismatch` |
| 3 | SELECT cost columns on products | **Allowed** | Permission denied / NULL in views |
| 4 | SELECT cost views | Partial app gating | View masks NULL |
| 5 | Financial RPCs | Partial | `report_sales_summary` masks profit |
| 6 | Fake `insert_audit_log` | **Allowed** | `audit_log_direct_insert_denied` |
| 7 | PO with another user's `created_by` | **Allowed** | `created_by_spoof_denied` |
| 8 | Call RLS helpers directly | Read-only helpers | Unchanged (no escalation) |
| 9 | Product Org B | Blocked by RLS | Blocked |
| 10 | Export Org B report | Blocked by RPC org check | Blocked |

Live confirmation: **REQUIRES LIVE DB QA** for all rows.

---

## 13. Cost permission matrix (seeded presets)

Legend: **Y** = can see; **N** = masked/denied; **E** = export allowed.

| Role | Base product cost | Variant cost | Purchase cost | Inventory value | COGS | Profit | Margin | Export financial |
|------|-------------------|--------------|---------------|-----------------|------|--------|--------|------------------|
| Owner | Y | Y | Y | Y | Y | Y | Y | Y |
| Administrator | Y | Y | Y | Y | Y | Y | Y | Y |
| Manager | Y | Y | Y | Y | Y | Y | Y | Y |
| Seller | N | N | N | N | N | N | N | N |
| Warehouse | N | N | N | N | N | N | N | N |
| Read-only / Auditor | N | N | N | N | N | N | N | N |

**Policy note:** Test factory presets in `tests/setup/factories.ts` are narrower than DB seeds in `00027`; live behavior follows migration seeds. Consider aligning the factory in a follow-up.

---

## 14. Tests

| Case | Classification |
|------|----------------|
| A–D Tenant / profile refs | REQUIRES LIVE DB QA |
| E App path cost denial (seller) | VERIFIED BY UNIT TEST + service code |
| F Direct DB cost path | REQUIRES LIVE DB QA |
| G Fake audit | REQUIRES LIVE DB QA |
| H PO spoof | REQUIRES LIVE DB QA |
| I PO atomicity | REQUIRES LIVE DB QA (00029) |
| J PO idempotency | REQUIRES LIVE DB QA |
| K Cross-org data | REQUIRES LIVE DB QA |
| L Manager legitimate access | VERIFIED BY UNIT TEST |
| M Owner/Admin manage permissions | VERIFIED BY UNIT TEST |
| N Seller cannot edit matrix | VERIFIED BY UNIT TEST |

---

## 15. Remaining Phase 0 risks

| Risk | Severity | Notes |
|------|----------|-------|
| Live DB not yet validated | High | Apply 00030 in staging first |
| Audit not transactional with all mutations | Medium | Documented |
| `role_permissions` is global table | Medium | Phase 1 RPC required |
| Sale form idempotency key per submit (not ref) | Low | PO fixed; sales unchanged |
| Movement report embed cleanup | Low | Fixed in services |

---

## 16. SAFE TO APPLY 00030

**YES** — assuming 00029 is applied and staging smoke-test passes.

Review checklist before production:
1. Confirm views grant SELECT to `authenticated`
2. Smoke-test product list/detail, PO create/receive, dashboard, reports as Seller and Manager
3. Confirm server audit writes succeed (service role env present)

---

## 17. Apply commands (operator only)

```powershell
# Local linked project (operator runs — not executed by agent)
supabase migration up --linked

# Or paste supabase/migrations/00030_phase0_security_closure.sql in Supabase SQL Editor
# after confirming 00029 is applied.
```

Post-apply verification:

```powershell
npx tsc --noEmit
npm run build
npx vitest run
```

---

**Phase 0 status:** Closure code complete in repo. Phase 1 (permission editor UI, Excel import, Keep AI mutations) **not started**.
