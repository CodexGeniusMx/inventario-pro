# Keep Inventory — Enterprise Roadmap

**Date:** 2026-08-19  
**Principle:** Correctness → intuitive UX → security → migration ease → business value → maintainability  
**Status:** Planning document — **Phase 0 implemented 2026-08-19** (see [phase-0-trust-hardening-report.md](./phase-0-trust-hardening-report.md), [phase-0-security-closure-report.md](./phase-0-security-closure-report.md))

Companion documents:
- [Enterprise Readiness Audit](./enterprise-readiness-audit.md)
- [Workflow Registry](./workflow-registry.md)
- [Security Architecture](./security.md)

---

## Roadmap philosophy

Keep Inventory already has **authoritative inventory RPCs** and a **permission seed model**. The roadmap prioritizes making those guarantees **visible and enforceable everywhere** (RLS, exports, AI, imports) before adding feature breadth.

Quantity of features is explicitly deprioritized until:
1. A non-technical owner can onboard staff and stock without CodexGenius intervention (import + guided setup)
2. A seller cannot accidentally see costs or break catalog data
3. An auditor can answer “who changed what?”

---

## Phase 0 — Trust & alignment (P0)

**Status:** ✅ **IMPLEMENTED** (2026-08-19) — migration `00029`, services, tests, docs. **Awaiting manual migration apply + QA.**

**Goal:** Same permission story at UI, service, RPC, RLS, export, and Keep AI layers.

**Duration estimate:** 2–3 weeks

### Deliverables

| # | Deliverable | Evidence driver |
|---|-------------|-----------------|
| 0.1 | Apply `00028_catalog_qa_hardening.sql` (fixed view column order) | Failed remote migration |
| 0.2 | New migration: RLS policies use `has_permission()` for catalog, categories, POs, warehouses, suppliers — mirror `00027` seeds | D-01 in audit |
| 0.3 | Gate inventory report UI + CSV export: omit `unit_cost` / `inventory_value` without `products.view_cost` OR `financial.costs` | D-02 |
| 0.4 | Gate sales report COGS/profit similarly with `financial.profit` | Export route COGS columns |
| 0.5 | Write `docs/security.md` (threat model, trust boundaries, test requirements) | Empty file |
| 0.6 | Integration tests: org A ≠ org B (read/write/search/export/AI) | No RLS tests today |
| 0.7 | Permission regression: seller, read_only, manager matrices | `product-permissions.test.ts` pattern |

### Tests (exit criteria)

- [ ] Manager with `products:edit` can persist product via UI **and** DB  
- [ ] `read_only` + `reports:read` cannot export cost columns  
- [ ] Seller cannot access cost via report, Keep AI acquisition tool, or product detail  
- [ ] Cross-tenant read/write attempts fail  

### Risks

- RLS policy changes may block existing manager workflows that “worked” only because user was admin  
- Mitigation: staged rollout + policy tests per table  

### Do not start yet

- Permission matrix UI  
- Import  
- Redis  

---

## Phase 1 — Adopt & migrate (P1)

**Goal:** A business can move from Excel without re-entering 500–5,000 SKUs manually.

**Duration estimate:** 4–6 weeks

### 1A — Import foundation

| # | Deliverable |
|---|-------------|
| 1.1 | Import job model (status, actor, source, row counts, error artifact URL/path) |
| 1.2 | CSV + XLSX parser with header detection |
| 1.3 | Column mapping UI with suggestions |
| 1.4 | Preview + row-level validation |
| 1.5 | Duplicate detection queue (barcode → SKU → external_id → name fuzzy) |
| 1.6 | **Never auto-merge** ambiguous variants (PS5 vs PS5 Slim) |
| 1.7 | Initial stock via `create_stock_adjustment` / `initial_stock` RPC batch |
| 1.8 | Downloadable error report |
| 1.9 | Audit log entries for import jobs |

**P0 import entities:** products, variants, SKU, barcode, categories, units, customers, suppliers, external refs, initial inventory.

### 1B — Scale UX foundation

| # | Deliverable |
|---|-------------|
| 1.10 | Server-side pagination + sorting on products list |
| 1.11 | Extend to sales, purchases, movements, customers |
| 1.12 | Enterprise table component: loading/empty states, column visibility hooks |
| 1.13 | Permission-aware columns (cost hidden at server + UI + export) |

### 1C — Catalog completeness

| # | Deliverable |
|---|-------------|
| 1.14 | Categories admin page (list, rename, archive with safety) |
| 1.15 | Units admin in settings |
| 1.16 | Multi-variant product UI (add/edit/remove variants) |
| 1.17 | PO create wrapped in single RPC transaction |

### 1D — Audit & onboarding

| # | Deliverable |
|---|-------------|
| 1.18 | Audit log writer service + immutable inserts |
| 1.19 | Auditor UI (read_only + audit:read) — filter by entity/action/date |
| 1.20 | In-app owner onboarding checklist (warehouse, product, stock, invite seller) |

### Tests (exit criteria)

- [ ] Import 100-row fixture idempotent on retry  
- [ ] Import stock creates movements, not balance hacks  
- [ ] Product list < 300ms TTFB at 10k rows (ASSUMPTION — benchmark in Phase 3)  
- [ ] Audit entries for product create, adjustment, import  

---

## Phase 2 — Operate daily (P1/P2)

**Goal:** Sellers and warehouse staff work quickly; managers get attention signals.

**Duration estimate:** 4–6 weeks

### 2A — Keep AI 2.0

| # | Deliverable |
|---|-------------|
| 2.1 | Confirm pipeline → existing services (sale, receive, adjust, return) |
| 2.2 | Draft edit conversation (“eran 2, no 3”) |
| 2.3 | Entity disambiguation UI when multiple matches |
| 2.4 | Screen context (route + entity id passed to orchestrator) |
| 2.5 | Risk tiers: green read / yellow confirm / red strong confirm |
| 2.6 | Adversarial test suite (prompt injection, permission bypass) |

### 2B — Attention & search

| # | Deliverable |
|---|-------------|
| 2.7 | Dashboard “Requiere tu atención” (low stock, pending POs, import errors) |
| 2.8 | In-app notification center (read/unread) |
| 2.9 | Global search: movements, returns, categories; archived rules per context |
| 2.10 | Optional org aliases assisting search (admin-confirmed) |

### 2C — UX polish

| # | Deliverable |
|---|-------------|
| 2.11 | Terminology pass (adjustments → “Corregir existencias”, etc.) |
| 2.12 | Inline help on reorder point, cost vs sale price, receiving vs PO |
| 2.13 | Role-aware navigation (hide forbidden actions) |
| 2.14 | Per-user theme: light / dark / system |

### Tests

- [ ] Keep AI confirm sale creates same record as UI sale (same idempotency semantics)  
- [ ] Disambiguation required for “play” when PS5 + Portal exist  

---

## Phase 3 — Govern & scale (P2)

**Goal:** Larger catalogs, delegated administration, operational confidence.

**Duration estimate:** 6–8 weeks (ongoing)

| # | Deliverable |
|---|-------------|
| 3.1 | Organization permission matrix editor + restore defaults |
| 3.2 | Custom roles (clone from template) |
| 3.3 | Performance benchmarks: 1k / 10k / 50k products |
| 3.4 | Search optimization (trigram indexes, ranked search) |
| 3.5 | Saved views + column preferences per user |
| 3.6 | Bulk actions (archive, export selection) with permission checks |
| 3.7 | Warehouse transfers (paired transfer_in/out movements) |
| 3.8 | Return disposition enhancements |
| 3.9 | 2FA encouragement for Owner/Admin (Supabase TOTP) |
| 3.10 | Session list + revoke (where Supabase API allows) |

### Observability (RECOMMENDATION)

- Error monitoring (Sentry or similar)  
- Structured app logs for security events  
- Backup restore drill documented quarterly  

### Cache / Redis (FUTURE — only if benchmarks justify)

Per `architecture.md` §18:
- Report cache  
- Keep AI rate limiting  
- Import/export job queue  

**Never** cache inventory balances as source of truth.

---

## Phase 4 — Ecosystem (FUTURE)

| Area | Notes |
|------|-------|
| n8n | CodexGenius-operated; scoped API keys; no client credentials |
| WhatsApp | Read-first; mutations require elevated confirmation |
| E-commerce | Webhook + SKU sync; out of scope until catalog/import stable |
| Brands / price lists | After multi-variant + import proven |
| Multi-branch | Schema has `branches`; no UI |

---

## Feature classification matrix

| Feature | Phase | Priority |
|---------|-------|----------|
| RLS / permission alignment | 0 | P0 |
| Report/export cost gating | 0 | P0 |
| Cross-tenant tests | 0 | P0 |
| Import MVP | 1 | P0/P1 |
| Pagination | 1 | P1 |
| Audit log | 1 | P1 |
| Multi-variant UI | 1 | P1 |
| Category/unit admin | 1 | P1 |
| Keep AI mutations | 2 | P1 |
| Onboarding wizard | 1 | P1 |
| Enterprise tables | 1–2 | P1 |
| Permission matrix editor | 3 | P2 |
| Learned aliases | 2–3 | P2 |
| Theme / a11y prefs | 2 | P2 |
| Transfers | 3 | P2 |
| 2FA / sessions | 3 | P2 |
| Redis | 3+ | FUTURE |
| n8n / WhatsApp | 4 | FUTURE |
| Custom roles | 3 | P2 |
| E-commerce | 4 | FUTURE |

---

## Migration assistant design summary (Phase 1 reference)

Detailed requirements live in audit §D. Core rules:

1. **Stock → ledger only**  
2. **Identity matching priority** (barcode > SKU > external_id > alias > name > fuzzy > AI suggest)  
3. **Confidence levels** with manual review band  
4. **Partial import** + error artifact  
5. **Job audit trail**  
6. **Idempotent job keys**  

---

## Success metrics (RECOMMENDATION)

| Metric | Target |
|--------|--------|
| Time to first sale (new org) | < 2 hours self-serve (post Phase 1) |
| Import success rate | > 95% rows on first pass with review queue for ambiguous |
| Permission bypass incidents | 0 in test suite |
| Seller task completion | Create sale in < 10 clicks |
| p95 product list load | < 500ms at 10k SKUs (post pagination) |

---

## What we intentionally defer

- Feature parity with legacy ERP systems  
- Full accounting module  
- Mobile native apps  
- Multi-currency sale checkout (catalog base currency decision documented in `commercial-onboarding.md`)  
- Customer self-registration / multi-org users  

---

## Next action for product/engineering

**Start with Phase 0 only.** Do not parallelize import and RLS migration without completing cost-gating tests — import will duplicate permission mistakes at scale.

When Phase 0 exit criteria are met, schedule Phase 1 import spike with a real customer spreadsheet fixture (anonymized) before UI polish.
