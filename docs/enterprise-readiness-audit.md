# Keep Inventory — Enterprise Readiness Audit

**Product:** Keep Inventory by CodexGenius  
**Audit date:** 2026-08-19  
**Phase 0 update:** 2026-08-19 — see [Phase 0 Trust Hardening Report](./phase-0-trust-hardening-report.md), [Phase 0 Security Closure Report](./phase-0-security-closure-report.md), and [Security Architecture](./security.md)

**Auditor mode:** Agents Orchestrator (evidence-based)  
**Reference model:** Specialist perspectives aligned with [agency-agents](https://github.com/msitarzewski/agency-agents)

> **Phase 0 status:** Trust hardening **IMPLEMENTED in code** (migrations `00029` + `00030`). Items below marked **RESOLVED (Phase 0)** where applicable. Live Supabase verification **pending manual QA**.

**Evidence labels used throughout:**
- **CONFIRMED FROM CODE** — verified in repository
- **ASSUMPTION** — plausible but not fully verified in code or runtime
- **RECOMMENDATION** — forward-looking design guidance

---

## 1. Executive summary

Keep Inventory is a **credible multi-tenant inventory platform** with strong foundations: immutable inventory ledger, SECURITY DEFINER RPCs with row locking, server-authoritative sale pricing, granular role seeds (migration `00027`), invitation flow, Keep AI with offline evaluation harness, and live dashboard/reports.

It is **not yet enterprise-ready for self-serve adoption at scale** without targeted hardening. The largest blockers are:

1. **Permission/RLS misalignment** — **RESOLVED (Phase 0)** via `00029` RLS helpers. **NOT YET VERIFIED** on live DB.
2. **Cost data leakage via reports/export** — **RESOLVED (Phase 0)** via `lib/auth/financial-data.ts` + service stripping.
3. **No migration/import path** — unchanged (**CONFIRMED FROM CODE**).
4. **Audit log schema without application wiring** — **RESOLVED (Phase 0)** via `insert_audit_log` + service/trigger wiring. Full coverage **PARTIAL**.
5. **Catalog scale gaps** — unchanged.
6. **Keep AI mutations are preview-only** — unchanged (out of Phase 0 scope).
7. **Empty security documentation** — **RESOLVED (Phase 0)** — `docs/security.md` populated.

**Verdict:** Suitable architecture for the roadmap **with phased investment**. **NO-GO** for unsupervised multi-tenant production at 10k+ SKUs until P0 security/permission alignment, audit wiring, and import MVP are addressed.

---

## 2. Current architecture map

### 2.1 Stack (CONFIRMED FROM CODE)

| Layer | Technology | Key paths |
|-------|------------|-----------|
| Frontend | Next.js App Router, React, shadcn/ui, Tailwind | `app/(app)/*`, `components/*` |
| Server | Server Actions + 3 API routes | `app/actions/*`, `app/api/*` |
| Services | TypeScript service layer | `services/**/*` |
| Auth | Supabase Auth SSR cookies | `lib/supabase/*`, `middleware.ts` |
| Database | PostgreSQL + RLS + RPCs | `supabase/migrations/00001`–`00028` |
| AI | Keep AI orchestrator + tools | `lib/keep-ai/*` |

### 2.2 Tenant model

```
auth.users
  └── profiles (organization_id, role, is_active)
        └── organizations (currency, settings, AI flags)
              └── all business tables (organization_id FK)
```

**Source:** `00002_tenant_and_access.sql`, `00026_commercial_hardening_schema.sql`

### 2.3 Request trust boundary

```
Browser
  → middleware.ts (session refresh; /api not gated)
  → app/(app)/layout.tsx (requireUserOrRedirect — profile required)
  → Server Action / API (requireUser / requirePermission)
  → Service (assertCan* / business rules)
  → Supabase client (RLS as user) OR RPC (SECURITY DEFINER)
```

**Source:** `docs/backend.md`, `lib/auth/session.ts`, `middleware.ts:15-17`

### 2.4 Major workflow map (abbreviated)

See [workflow-registry.md](./workflow-registry.md) for full 25-workflow registry.

| Workflow | UI | Action | Service | RPC / DB |
|----------|-----|--------|---------|----------|
| Sale | `sales/new` | `sales.ts` | `sale.service.ts` | `create_and_complete_sale` |
| Receive PO | `purchases/[id]/receive` | `purchases.ts` | `purchase.service.ts` | `receive_purchase` |
| Adjustment | `inventory/adjustments/new` | `inventory.ts` | `inventory.service.ts` | `create_stock_adjustment` |
| Return | `sales/[id]/return` | `returns.ts` | `return.service.ts` | `process_return` |
| Product CRUD | `products/*` | `products.ts` | `product.service.ts` | Direct table + RLS |
| Keep AI | `keep-ai-assistant.tsx` | — | — | `POST /api/keep-ai` → tools |

**Inventory mutations:** all funnel to `record_inventory_movement` (`00015`) — append-only movements, locked balances.

### 2.5 Migrations inventory (28 files)

Latest: `00028_catalog_qa_hardening.sql` (units catalog, pricing view columns, archive fix) — **must be applied remotely** after column-order fix.

---

## 3. What already works well

| Area | Evidence | Specialist lens |
|------|----------|-----------------|
| Immutable inventory ledger | `prevent_inventory_movement_mutation()` `00005` | Backend Architect |
| Non-negative stock | RPC check + `CHECK (quantity_on_hand >= 0)` | Database |
| Sale price authority | `00021_authoritative_sale_pricing.sql` | Security |
| Idempotency (sales/receive/returns) | `idempotency_key` on movements `00005` | Reliability |
| Role expansion + seeds | `00026`, `00027` | PM |
| Invitation end-to-end | `user.service.ts`, callback, RPC | Workflow Architect |
| Keep AI offline eval (232+ tests) | `tests/keep-ai/evaluation.test.ts` | AI specialist |
| Product permission hardening (recent) | `lib/auth/product-permissions.ts` | Security |
| Spanish movement labels | `lib/inventory/labels.ts` | UX |
| Dev tools gated | `/dev/testing` 404 in production `middleware.ts:57` | DevOps |
| Report + dashboard live data | `dashboard.service.ts` | PM |

---

## 4. Confirmed defects / irregularities

| ID | Finding | Severity | Evidence |
|----|---------|----------|----------|
| D-01 | RLS catalog writes require `is_admin()` while app checks granular permissions | High | `00012` `products_admin_write` vs `product-permissions.ts` |
| D-02 | Inventory report/export shows cost without `products.view_cost` | High | `getInventoryReport()` selects `unit_cost`; `read_only` lacks view_cost in `00027` |
| D-03 | `audit_logs` never populated by application | Medium | Grep: only `lib/database.types.ts` |
| D-04 | Keep AI action confirm is stub | Medium | `keep-ai-assistant.tsx:228` |
| D-05 | Product list loads entire catalog (no pagination) | Medium | `product.service.ts` `listProducts` |
| D-06 | Single-variant product form only | Medium | `product-form.tsx` |
| D-07 | PO create uses multi-step inserts (not atomic RPC) | Medium | `purchase.service.ts` |
| D-08 | Adjustment idempotency weaker than sales | Low | `00015` idempotency_conflict path |
| D-09 | `docs/security.md` empty | Medium | File length 0 |
| D-10 | `requirements.md` still describes MVP admin/employee only | Low | `docs/requirements.md:22` vs `00027` roles |
| D-11 | Migration `00028` failed remotely (view column order) — fixed locally | Ops | User report; append-at-end fix applied |
| D-12 | Products table shows raw unit code not label | Low | `products-table.tsx:64` vs detail `resolveUnitLabel` |
| D-13 | `/purchases/new` gates with `requireAdmin()` not `purchases:create` | Low | `purchases/new/page.tsx:17` |
| D-14 | Returns lack post-RPC movement verification | Low | `return.service.ts` vs `sale.service.ts` |

---

## 5. UX problems (“a prueba de todos”)

### 5.1 Terminology (CONFIRMED FROM CODE + RECOMMENDATION)

| Current / technical | Simpler Spanish (RECOMMENDATION) | Where |
|--------------------|----------------------------------|-------|
| Ajuste de stock | Corregir existencias / Entrada o salida manual | `inventory/adjustments` |
| Recepción de compra | Mercancía recibida | movements label OK |
| Punto de reorden | Mínimo antes de volver a pedir | product form |
| Variante predeterminada | Presentación principal | product form |
| Orden de compra | Pedido a proveedor | purchases (partially OK) |
| Movimientos | Historial de entradas y salidas | inventory sub-nav |

Recent QA improved product pricing labels to “Costo de compra” / “Precio de venta” (`product-form.tsx`) — **good pattern to extend**.

### 5.2 Progressive disclosure gaps

| Issue | Evidence |
|-------|----------|
| No first-run checklist for owner | `commercial-onboarding.md` is operator doc only |
| Warehouse required but not guided before first sale | ASSUMPTION — user must discover settings |
| Adjustment types expose domain concepts (damage/loss) without inline examples | `adjustment-form.tsx` |
| Seller sees full nav; some routes redirect/forbid | Sidebar not role-pruned — **ASSUMPTION**, verify `sidebar.tsx` |
| Empty states exist on products; not verified on all modules | `products-empty-state.tsx` |

### 5.3 Hidden / hard-to-find functionality

- Category rename/archive: backend only (`categories.ts`)
- Unit management: inline create only
- Archived products: filter on list, not obvious in selling flows
- Report export: behind report detail page

**RECOMMENDATION:** Contextual help, “¿Qué es esto?” tooltips on reorder point, cost vs sale price, and adjustment types.

---

## 6. Security risks

| Risk | Status | Evidence |
|------|--------|----------|
| Cross-tenant data read | Mitigated at RLS + RPC | `get_user_organization_id()` |
| Cross-tenant via crafted action | Mitigated if services use session org | Pattern in `product.service.ts` |
| Permission bypass — product cost (UI) | Recently fixed for products | `product-permissions.test.ts` |
| Permission bypass — reports/export cost | **OPEN** | `getInventoryReport`, export route |
| RLS bypass for non-admin catalog edit | **OPEN** — admin-only RLS | `00012` |
| API routes without middleware auth | Mitigated per-route | `/api/search`, `/api/keep-ai` call `requireUser` |
| Service role exposure | Server-only | `lib/supabase/admin.ts` |
| `/dev/testing` in production | Blocked | `middleware.ts` |
| Keep AI prompt injection → SQL | Mitigated — tools only, no arbitrary SQL | `executor.ts` |
| Keep AI cost via tools | Mitigated | `getProductAcquisitionCost` denied without permission |
| `profiles_update_self` role escalation | **UNVERIFIED** — no WITH CHECK on role column | `00012` policies |
| Supabase session handling | Documented OK | `docs/architecture.md` §19 |

**Automated test gap (CONFIRMED):** No RLS integration tests (`tests/integration/inventory.integration.test.ts` is placeholder).

---

## 7. Data integrity risks

| Risk | Mitigation | Residual |
|------|------------|----------|
| Negative stock | RPC + CHECK | Low |
| Duplicate sale on double-click | Idempotency key | Low |
| Duplicate receive | Idempotency key | Low |
| Duplicate adjustment retry | Partial — may conflict | Medium |
| Orphan PO header | Multi-step create | Medium |
| Price tampering on sale | Server RPC pricing | Low |
| Variant price 0-as-inherit bug | Fixed in `00028` + app | Low after migration |
| Direct stock UPDATE | Blocked — movements only | Low |
| Transfer workflows | Not implemented — enum only | N/A |

---

## 8. Permission gaps

### 8.1 Current model (CONFIRMED FROM CODE)

- Tables: `permissions`, `role_permissions` (`00002`)
- Granular seeds: `00027_commercial_hardening_permissions.sql`
- App: `lib/auth/permissions.ts` — owner/admin bypass; `product-permissions.ts` for catalog
- RPC: `has_permission(resource, action)` — legacy action names (`write`, `adjust`, `complete`)

### 8.2 Gaps

| Gap | Detail |
|-----|--------|
| RLS not using granular permissions | Catalog, POs, warehouses, suppliers, audit logs |
| Dual vocabulary | `products:edit` vs `products:write` |
| Legacy `employee` role | Still in enum; not invitable |
| No org-editable permission matrix | Seeds only — **RECOMMENDATION** |
| Export doesn't respect column-level cost permissions | **CONFIRMED** |
| `read_only` has `audit:read` but RLS audit select is admin-only | **CONFIRMED** |

### 8.3 Future: editable permissions (RECOMMENDATION)

Architecture **can support** org-specific role overrides via new table `organization_role_permission_overrides` + UI matrix — requires:
- Server enforcement in `hasPermission()` loader
- RLS policy updates to call same function
- Prevent owner lockout (minimum owner permissions immutable)
- Audit all matrix changes

---

## 9. Keep AI gaps

### 9.1 Current (CONFIRMED FROM CODE)

- Read tools: search, stock, sale/acquisition price, sales summary, pending purchases
- Fallback regex + context resolution (`lib/keep-ai/fallback.ts`)
- Permission-aware denials
- 212+ offline evaluation cases passing
- Org toggles: `ai-settings-form.tsx`

### 9.2 Gaps

| Gap | Priority |
|-----|----------|
| Mutation confirm not wired to services | P1 |
| No screen context (e.g. on PO page) | P1 |
| No entity disambiguation UI beyond text list | P1 |
| WhatsApp / n8n not integrated | FUTURE |
| Rate limiting | FUTURE (Redis note in architecture.md) |
| Adversarial prompt test suite limited | P1 |

**RECOMMENDATION (Keep AI 2.0):** Intent → entity resolution → permission → draft → preview → confirm → **same RPC/service as UI** → audit.

---

## 10. Migration / import readiness

**Status: NOT READY (CONFIRMED — no import code)**

### 10.1 P0 import scope (RECOMMENDATION)

Products, variants, SKU, barcodes, initial inventory (via adjustment workflow), customers, suppliers, categories, units, external IDs.

### 10.2 Identity matching priority (RECOMMENDATION)

1. Barcode exact  
2. SKU exact  
3. External reference  
4. Org-confirmed alias  
5. Normalized name  
6. Fuzzy similarity (review queue)  
7. AI suggestion **non-binding**

Never auto-merge PS5 / PS5 Slim / PS5 Pro.

### 10.3 Stock import rule (RECOMMENDATION)

Must create `initial_stock` or adjustment RPC lines — never UPDATE `inventory_balances` directly.

### 10.4 Learned aliases (FUTURE)

Table `organization_product_aliases` — assists import, search, Keep AI; requires admin confirmation.

---

## 11. Accessibility gaps

| Area | Finding | Evidence |
|------|---------|----------|
| Keyboard | react-aria components in UI kit | `components/ui/table.tsx`, `input-group.tsx` |
| aria-labels | Present on tables, nav, charts | grep hits |
| Focus management | Keep AI panel partial | `keep-ai-assistant.tsx` |
| Theme | shadcn dark: classes; **no user theme toggle** | no theme provider found |
| Screen reader announcements | Form errors visual; live regions **UNVERIFIED** | |
| Zoom / contrast | Tailwind defaults — **not audited to WCAG** | RECOMMENDATION: formal a11y pass |

**RECOMMENDATION:** Per-user appearance settings (light/dark/system), density, reduce motion — not implemented.

---

## 12. Performance / scaling risks

| Scale | Risk | Evidence |
|-------|------|----------|
| 1k products | Likely OK | Full list fetch |
| 10k products | **Product list/memory** | No pagination |
| 10k+ movements | Report queries | Indexes on `inventory_movements` `00005` |
| Search | ILIKE scans | `product.service.ts`, global search |
| Dashboard | Multiple parallel queries | `dashboard.service.ts` |
| Count queries | Head requests | dashboard uses count |

**Indexes present (CONFIRMED):** org+status on products, movement timestamps, sales completed_at (`00023`), etc.

**RECOMMENDATION:** Server-side pagination + keyset pagination for products/movements; consider trigram/GIN for search at 50k+ SKUs. Redis only for rate limit/report cache after benchmarks — per `architecture.md` §18.

---

## 13. Missing business capabilities

| Capability | Status |
|------------|--------|
| Multi-variant UI | Partial |
| Category admin page | Missing |
| Import/export catalog | Missing / partial |
| Warehouse transfers | Schema enum only |
| Reserved stock | Missing |
| Bulk actions | Missing |
| Saved views / column prefs | Missing |
| Notification center | Missing |
| 2FA / session management | Missing (Supabase supports TOTP — RECOMMENDATION) |
| Org permission editor | Missing |
| Custom roles | Missing |
| Barcode scanning | Missing |
| n8n / WhatsApp operational | Settings UI only |

---

## 14. P0 / P1 / P2 / FUTURE backlog

### P0 — Production blockers / security

| Item | Type |
|------|------|
| Align RLS with granular permissions (catalog, PO, audit) | Fix |
| Gate report/export cost columns by `products.view_cost` / `financial.costs` | Fix |
| Apply migration `00028` remotely | Ops |
| RLS + permission integration tests (org A vs B) | Test |
| Populate `docs/security.md` threat model | Doc |
| Seller/report permission regression suite | Test |

### P1 — Enterprise adoption enablers

| Item | Type |
|------|------|
| Excel/CSV import MVP (products + initial stock) | Feature |
| Server-side pagination (products, movements, sales) | Feature |
| Audit log writes + admin/auditor UI | Feature |
| Keep AI mutation confirm → services | Feature |
| Multi-variant product UI | Feature |
| Category + unit admin pages | Feature |
| Enterprise table foundation (sort, filter, export hooks) | Feature |
| Onboarding checklist in-app | UX |
| PO create transactional RPC | Fix |

### P2 — Scale & polish

| Item | Type |
|------|------|
| Org permission matrix editor | Feature |
| Learned aliases | Feature |
| Global search expansion | Feature |
| Notification center | Feature |
| Dashboard “Requiere tu atención” | UX |
| Adjustment document-level idempotency | Fix |
| Return post-RPC verification | Fix |
| Theme / accessibility preferences | Feature |
| Performance benchmarks (1k/10k/50k) | Ops |

### FUTURE

| Item |
|------|
| Warehouse transfers (linked movements) |
| Reserved stock |
| Custom roles / per-user exceptions |
| 2FA enforcement policies |
| Redis cache / job queues (after proof) |
| n8n / WhatsApp mutations with strong auth |
| E-commerce integrations |
| Brands, price lists, subcategories |

---

## 15. Dependencies between features

```
00028 migration applied
  └── units catalog + Keep AI pricing view
RLS permission alignment
  └── safe permission matrix editor
  └── reliable manager/warehouse roles
Audit log writes
  └── import job trail
  └── permission change trail
Import MVP
  └── learned aliases (optional)
  └── enterprise tables (preview rows)
Pagination
  └── enterprise tables at scale
Keep AI confirm pipeline
  └── Keep AI mutations (sales, receive, adjust)
```

---

## 16. Recommended implementation order

**Phase 0 — Trust (2–3 weeks)**  
1. Apply `00028`  
2. RLS alignment migration (new `00029+`, not yet created)  
3. Report/export cost gating  
4. Security doc + integration tests  

**Phase 1 — Adopt (4–6 weeks)**  
5. Import MVP  
6. Pagination + enterprise table base  
7. Audit log  
8. Category/unit admin  

**Phase 2 — Operate (4–6 weeks)**  
9. Keep AI 2.0 mutations  
10. Multi-variant UI  
11. Onboarding wizard  
12. Notification / attention center  

**Phase 3 — Scale (ongoing)**  
13. Benchmarks + search optimization  
14. Permission matrix editor  
15. Transfers / reserved stock  

---

## 17. Tests required per phase

| Phase | Tests |
|-------|-------|
| P0 | Cross-org RLS; seller cost bypass (UI, API, export, Keep AI); manager catalog CRUD vs RLS; permission regression |
| P1 | Import validation fixtures; pagination correctness; audit immutability; idempotent import retry |
| P2 | Keep AI adversarial prompts; disambiguation flows; performance smoke (10k products) |
| FUTURE | Transfer double-entry; WhatsApp auth boundary |

Current suite: **232 passed**, 4 skipped (`npm test`) — **CONFIRMED** recent run.

---

## 18. Risks per phase

| Phase | Risk |
|-------|------|
| RLS migration | Breaking manager workflows if policies too strict |
| Import | Bad merge → catalog corruption; mitigate with review queue |
| Keep AI mutations | Double execution if confirm not idempotent |
| Permission editor | Owner lockout if guardrails missing |

---

## 19. Do not build yet

- Redis (until benchmark proves need)
- n8n customer-facing config
- WhatsApp mutation channel without auth upgrade
- Custom roles before RLS alignment
- AI-driven auto-merge on import
- Multi-branch operations
- E-commerce sync

---

## 20. GO / NO-GO criteria for production

### GO when (RECOMMENDATION)

- [ ] All P0 items complete  
- [ ] `00028` applied in production  
- [ ] Cross-tenant test suite green  
- [ ] Cost data cannot leak via reports/export/search for unauthorized roles  
- [ ] Backup/restore tested (Supabase)  
- [ ] Import MVP OR documented manual onboarding SOP for CodexGenius  
- [ ] Incident runbook exists  

### NO-GO if

- RLS still admin-only for roles granted catalog edit in seeds  
- No audit trail for stock mutations (beyond movements ledger) when auditors expected  
- Selling to 10k SKU customers without pagination  

---

## Appendix A — Files inspected (representative)

**Docs:** `requirements.md`, `architecture.md`, `backend.md`, `database.md`, `security.md`, `roadmap.md`, `keep-ai-architecture.md`, `commercial-onboarding.md`, `testing.md`

**Auth:** `lib/auth/session.ts`, `permissions.ts`, `product-permissions.ts`, `roles.ts`, `middleware.ts`

**Catalog:** `services/catalog/product.service.ts`, `category.service.ts`, `unit.service.ts`, `components/products/*`

**Inventory/Ops:** `services/inventory/inventory.service.ts`, `services/purchasing/purchase.service.ts`, `services/sales/sale.service.ts`, `services/returns/return.service.ts`

**AI/Search:** `lib/keep-ai/*`, `services/search/global-search.service.ts`

**Reporting:** `services/reporting/dashboard.service.ts`, `report.service.ts`, `app/api/reports/[slug]/export/route.ts`

**Migrations:** `00001`–`00028` (especially `00005`, `00012`, `00015`, `00021`, `00027`, `00028`)

**Tests:** `tests/unit/*`, `tests/keep-ai/*`, `tests/integration/inventory.integration.test.ts`

---

## Appendix B — Assumptions needing manual confirmation

1. Remote DB state after failed `00028` — partial apply rollback (ASSUMPTION)  
2. Production Supabase backup schedule (ASSUMPTION)  
3. Whether sidebar hides admin routes per role (needs UI walkthrough)  
4. `profiles_update_self` cannot change `role` column via PostgREST (needs live test)  
5. Invitation `warehouse_id` not copied to profile (code review suggested; confirm RPC body)

---

## Appendix C — Architecture suitability

**Suitable for roadmap:** Yes. Clean separation (actions → services → RPC), immutable ledger, permission hooks, Keep AI tool architecture, and migration discipline support enterprise evolution without rewrite.

**Primary debt:** RLS/policy layer lagging app permission model; missing import and audit productization; scale UX (pagination/enterprise tables).
