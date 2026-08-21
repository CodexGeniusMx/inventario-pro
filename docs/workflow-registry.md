# Keep Inventory — Workflow Registry

**Audit date:** 2026-08-19  
**Method:** Code inspection (UI → action → service → RPC/DB → RLS).  
**Legend:** ✅ Implemented · ⚠️ Partial · ❌ Missing · 🔴 Unsafe/unverified · 📋 Recommendation only

Labels use **CONFIRMED FROM CODE**, **ASSUMPTION**, or **RECOMMENDATION** inline.

---

## Registry summary

| # | Workflow | Status | Primary evidence |
|---|----------|--------|------------------|
| 1 | Company onboarding | ⚠️ Partial | `docs/commercial-onboarding.md`, `00014_bootstrap_first_admin.sql` |
| 2 | Create first warehouse | ✅ | `warehouse.service.ts`, `inventory/warehouses/new` |
| 3 | Create first product | ✅ | `product.service.ts`, `products/new` |
| 4 | Variants | ⚠️ Partial | Single default variant in `product-form.tsx` |
| 5 | Categories | ⚠️ Partial | Inline create only; no admin page |
| 6 | Units | ⚠️ Partial | `00028`, `unit.service.ts`; no settings UI |
| 7 | Personal settings | ✅ Phase 1A | `/account/*`, `user_preferences`, migration `00032` |
| 8 | Role permission editor | ✅ Phase 1A | `/settings/permissions`, org overrides RPC |
| 7 | Initial stock | ✅ | `create_stock_adjustment` + `initial_stock` type |
| 8 | Inventory adjustment | ✅ | `inventory.service.ts` → RPC |
| 9 | Purchase order | ✅ | `create_purchase_order` RPC (`00029`) — atomic |
| 10 | Partial purchase receiving | ✅ | `receive_purchase` RPC (`00017`) |
| 11 | Complete receiving | ✅ | PO status → `received` in RPC |
| 12 | Sale | ✅ | `create_and_complete_sale` (`00021`) |
| 13 | Return | ✅ | `process_return` (`00022`) |
| 14 | Product archive | ✅ | `archiveProduct` — status only (`product.service.ts`) |
| 15 | Product reactivation | ✅ | `reactivateProduct` (`product.service.ts`) |
| 16 | Customer creation | ✅ | `customer.service.ts`, `customers/new` |
| 17 | Supplier creation | ✅ | `supplier.service.ts`, `suppliers/new` |
| 18 | User invitation | ✅ | `complete_user_invitation` applies `warehouse_id` → `profiles.default_warehouse_id` (`00029`) |
| 19 | Permission enforcement | ⚠️ Partial | App/RPC + DB closure in Phase 0 (`00029`–`00030`); live RLS verification pending |
| 20 | Dashboard / reports | ✅ | `dashboard.service.ts`, `report.service.ts` |
| 21 | Keep AI query | ✅ | `lib/keep-ai/*`, `/api/keep-ai` |
| 22 | Keep AI mutation | ❌ | Confirm stub in `keep-ai-assistant.tsx:220-229` |
| 23 | Global search | ⚠️ Partial | `global-search.service.ts` — 5 entity types |
| 24 | Import | ❌ | No routes/actions |
| 25 | Export | ⚠️ Partial | Report CSV only; `reports/[slug]/export` |

---

## Detailed workflow maps

### 1. Company onboarding

| Layer | Path / artifact |
|-------|-----------------|
| **Process** | Manual CodexGenius setup — **CONFIRMED** `docs/commercial-onboarding.md` |
| **Bootstrap RPC** | `bootstrap_first_admin` — `00014_bootstrap_first_admin.sql` (service_role only) |
| **In-app wizard** | ❌ No first-run guided setup in app routes |
| **Owner config** | Settings pages — `app/(app)/settings/page.tsx` |

**Edge cases**

| Case | Behavior | Evidence |
|------|----------|----------|
| Happy path | Manual bootstrap → owner login → settings | `commercial-onboarding.md` |
| Duplicate bootstrap | RPC guards “no org exists” | `00014` |
| User without profile | Redirect / missing profile errors | `requireUserOrRedirect` in `app/(app)/layout.tsx` |
| Partial migration | Graceful redirect logging | `lib/auth/redirect-log.ts` |

**Status:** ⚠️ Partial — operational for CodexGenius-led onboarding; no self-serve or in-app checklist.

---

### 2. Create first warehouse

```
UI: /inventory/warehouses/new
→ warehouse.service.ts (createWarehouse)
→ Supabase INSERT warehouses
→ RLS: branches_admin_write / warehouses policies (00012) — is_admin()
```

**Status:** ✅ Implemented. **Permission note:** RLS admin-only write; app may use `requireAdmin` or permission checks inconsistently across modules.

---

### 3. Create first product

```
UI: /products/new → ProductForm
→ createProductAction (app/actions/products.ts)
→ assertCanCreateProducts
→ product.service.ts createProduct
→ INSERT products + product_variants
→ RLS: products_admin_write (00012) — is_admin() only at DB layer
```

**Status:** ✅ Implemented. **🔴 RLS gap:** manager with `products:create` may pass app checks but fail RLS INSERT (see Security audit).

---

### 4. Variants

```
UI: product-form.tsx — single "Variante predeterminada"
→ updateProduct updates variants[0] only
→ Detail lists all variants (products/[id]/page.tsx)
```

**Status:** ⚠️ Partial — schema supports many variants (`00003_catalog.sql`); UI is single-variant MVP.

---

### 5. Categories

```
UI: ProductsFilters dropdown + CreateCategoryDialog in product-form
→ category.service.ts (list/create/rename/archive)
→ categories.ts actions
→ No /categories admin route
```

**Status:** ⚠️ Partial — `parent_id` in schema unused; rename/archive have no UI.

---

### 6. Units

```
UI: select + CreateUnitDialog in product-form
→ unit.service.ts → organization_units (00028)
→ Fallback DEFAULT_UNITS if table missing (42P01)
```

**Status:** ⚠️ Partial — no unit management page; no edit/archive UI.

---

### 7. Initial stock

```
UI: /inventory/adjustments/new — type "initial_stock"
→ createStockAdjustmentAction
→ RPC create_stock_adjustment → record_inventory_movement
```

**Status:** ✅ Implemented. Movement type mapped in `00010_inventory_functions.sql`.

---

### 8. Inventory adjustment

```
UI: adjustment-form.tsx (idempotencyKey: crypto.randomUUID())
→ inventory.service.ts createStockAdjustment
→ RPC create_stock_adjustment (00015)
→ Post-verify movement links on adjustment lines
```

| Edge case | Handling |
|-----------|----------|
| Negative stock | RPC `insufficient_stock` + DB CHECK |
| Double submit | Idempotency per line; **weak document-level retry** for adjustments |
| Permission denied | `inventory.adjust` in RPC |
| Concurrent edits | `FOR UPDATE` on balance row |

**Status:** ✅ Implemented · ⚠️ adjustment idempotency weaker than sales/receiving.

---

### 9–11. Purchase order → partial/complete receiving

```
Create PO: /purchases/new → requireAdmin() (page gate)
→ purchase.service.ts createPurchaseOrder — multi-step INSERT (not single RPC)
→ No inventory impact until receive

Receive: /purchases/[id]/receive
→ receivePurchaseOrder → RPC receive_purchase (00017)
→ purchase_receipt + movements; PO status ordered/partially_received/received
→ Idempotency at receipt level
→ over_receipt blocked
```

**Status:** ✅ Implemented. **⚠️** PO create not transactional at app layer. **⚠️** New PO page uses `requireAdmin()` not granular `purchases:create`.

---

### 12. Sale

```
UI: sale-form.tsx (idempotencyKey)
→ createSaleAction → sale.service.ts
→ RPC create_and_complete_sale (00021) — server-authoritative pricing
→ Post-verify all sale lines have movements
```

**Status:** ✅ Implemented.

---

### 13. Return

```
UI: return-form.tsx
→ processReturnAction → return.service.ts
→ RPC process_return (00022)
→ Restockable: sale_return movement; non-restockable: damage qty=0 audit movement
```

**Status:** ✅ Implemented. **⚠️** No post-RPC movement verification (unlike sales/receiving).

---

### 14–15. Archive / reactivate product

```
Archive: ArchiveProductButton → archiveProductAction → archiveProduct (status=archived)
Reactivate: ReactivateProductButton → reactivateProductAction → reactivateProduct
→ Requires products.archive (product-permissions.ts)
```

**Status:** ✅ Implemented (recent QA hardening). **CONFIRMED** archive no longer sets `deleted_at` (`00028`).

---

### 16–17. Customer / supplier creation

```
/customers/new, /suppliers/new
→ party services + actions
→ RLS: is_admin() OR has_permission write (00012) for customers
```

**Status:** ✅ Implemented.

---

### 18. User invitation

```
/users → InviteUserForm
→ inviteOrganizationUser (user.service.ts)
→ user_invitations INSERT + auth.admin.inviteUserByEmail
→ /auth/callback → /accept-invite → complete_user_invitation RPC
```

**Status:** ✅ Implemented. **⚠️** `warehouse_id` on invitation not applied to profile (ASSUMPTION from prior audit — verify in `00026` RPC).

---

### 19. Permission enforcement

| Layer | Status |
|-------|--------|
| Server actions | ✅ Granular checks added for products (`product-permissions.ts`) |
| Services | ✅ Mixed — products strong; others use `hasPermission` / `requireAdmin` |
| RPCs | ✅ `has_permission()` inside SECURITY DEFINER functions |
| RLS | ⚠️ Many writes still `is_admin()` only (00012) |
| Keep AI | ✅ Tool executor + fallback permission checks |
| Export | 🔴 Inventory report/export includes cost without `products.view_cost` check |
| Global search | ✅ Permission-gated per entity type |

**Status:** ⚠️ Partial — **CONFIRMED** defense-in-depth gaps between app granular permissions and RLS/export.

---

### 20. Dashboard / reports

```
/dashboard → dashboard.service.ts (RPCs + views)
/reports → report.service.ts
Export: GET /api/reports/[slug]/export — requirePermission reports.read
```

**Status:** ✅ Implemented. **⚠️** Cost columns in inventory report not gated by `products.view_cost` / `financial.costs`.

---

### 21–22. Keep AI query / mutation

```
Query: KeepAiAssistant → POST /api/keep-ai → runKeepAiQuery (orchestrator)
→ tools: executor.ts / fallback.ts
→ Permission checks per tool

Mutation: preparedAction preview → onConfirm STUB (keep-ai-assistant.tsx:228)
```

**Status:** Query ✅ · Mutation ❌ (preview only).

---

### 23. Global search

```
Ctrl+K → global-search.tsx → GET /api/search
→ runGlobalSearch (products, customers, suppliers, POs, sales)
```

**Status:** ⚠️ Partial — no movements, returns, categories, users; archived products excluded from name search (`global-search.service.ts:56`).

---

### 24. Import

**Status:** ❌ Missing — no import routes, actions, or UI. **RECOMMENDATION:** design in enterprise-readiness-audit §D.

---

### 25. Export

```
Report CSV: /api/reports/[slug]/export
Product/catalog bulk export: ❌
```

**Status:** ⚠️ Partial.

---

## Cross-cutting workflow concerns

| Concern | Finding | Evidence |
|---------|---------|----------|
| Audit trail UI | ❌ `audit_logs` table exists; **no app writes or UI** | `00008_operations.sql`; grep shows types only |
| Browser refresh mid-form | Standard form state loss; idempotency helps completed mutations only | Form clients use local state |
| Network failure | Generic errors; sale/receive return idempotent keys | `toActionResult` patterns |
| Cross-tenant | Org ID from session; RPC `assert_same_organization` | `00009`, `00015` |
| Raw enum labels | Mostly translated via `lib/inventory/labels.ts`, `lib/sales/labels.ts` | Some dashboard uses centralized formatter |
| Development routes | `/dev/testing` blocked in production | `middleware.ts:57-59` |

---

## Unsafe / unverified workflows

| Workflow | Risk | Priority |
|----------|------|----------|
| Manager product create via app | App allows; RLS may deny | P0 align RLS |
| Read-only user inventory report | Sees unit cost without view_cost | P0 |
| Keep AI confirm mutation | User sees preview but cannot execute safely | P1 (by design until phase 2) |
| PO create multi-step | Partial failure could orphan header | P1 |
| Adjustment retry | idempotency_conflict vs duplicate doc | P2 |

---

## Related documents

- [Enterprise Readiness Audit](./enterprise-readiness-audit.md)
- [Enterprise Roadmap](./enterprise-roadmap.md)
