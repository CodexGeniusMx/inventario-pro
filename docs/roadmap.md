# Inventario Pro — Development Roadmap

This roadmap divides development into **vertical phases**. Each phase delivers a complete slice: database schema, backend logic, frontend UI, validation, and tests. Do not build all frontend screens first and connect the backend later.

Phases are sequential unless noted. Complete acceptance criteria and testing before starting the next phase.

---

## Phase 0: Project Foundation

### Objective

Establish the development environment, Supabase connection, base layout, and documentation baseline so every subsequent phase builds on a stable foundation.

### Functionality

- Next.js App Router project configured with TypeScript strict mode.
- Tailwind CSS and shadcn/ui installed and themed.
- Supabase client utilities (browser, server, middleware).
- Base application shell: sidebar navigation, header, responsive layout.
- Environment variable template (`.env.example`).
- Placeholder dashboard route at `/dashboard`.
- Health check Route Handler verifying database connectivity.

### Database Impact

- Supabase project created (dev environment).
- Initial migration: `organizations` table with one seed organization.
- No business tables yet.

### Backend Impact

- `lib/supabase/` client factories.
- Middleware for session refresh (placeholder; full auth in Phase 1).
- Basic error handling utilities.

### Frontend Impact

- Root layout with app shell (sidebar, main content area).
- Navigation structure matching future modules (disabled/placeholder links).
- Loading skeleton component.
- 404 and error boundary pages.

### Acceptance Criteria

- [ ] `npm run dev` serves the app at `http://localhost:3000`.
- [ ] `npm run build` succeeds without errors.
- [ ] Supabase connection verified via health check endpoint.
- [ ] Responsive layout renders on desktop and tablet widths.
- [ ] `/docs` contains requirements, architecture, and roadmap.

### Testing Requirements

- Manual: verify dev server, build, and layout in browser.
- Manual: health check returns success against dev Supabase.
- No automated tests required in this phase.

---

## Phase 1: Authentication and Users

### Objective

Implement secure authentication and basic user management so all subsequent features operate within an authenticated, role-aware context.

### Functionality

- Email/password login and logout.
- Session persistence via Supabase SSR cookies.
- Protected routes (redirect unauthenticated users to login).
- User profile table linked to Supabase Auth.
- Admin: list users, invite/create user, assign role (Admin/Employee), deactivate user.
- Current user profile view and edit (name).
- Role loaded server-side on every request.

### Database Impact

- `profiles` table: `id` (FK auth.users), `organization_id`, `full_name`, `role`, `is_active`, timestamps.
- Trigger or function to create profile on auth user creation.
- RLS policies: users read own profile; admins manage org profiles.
- Seed: one admin user for development.

### Backend Impact

- Auth middleware protecting `(dashboard)` route group.
- Server Actions: login, logout, update profile, create user, update role, deactivate user.
- `lib/auth/` helpers: `getSession()`, `getCurrentUser()`, `requireRole()`.
- Authorization checks on all user management actions.

### Frontend Impact

- Login page with form validation and error states.
- User list page (admin only).
- User create/edit dialog.
- Profile settings page.
- Role-aware navigation (hide admin-only links for employees).

### Acceptance Criteria

- [ ] Unauthenticated access to `/dashboard` redirects to login.
- [ ] Valid credentials establish session and reach dashboard.
- [ ] Logout clears session.
- [ ] Admin can create a user with Employee role.
- [ ] Admin can deactivate a user; deactivated user cannot log in.
- [ ] Employee cannot access user management pages (403 or redirect).
- [ ] Profile update persists and displays on reload.

### Testing Requirements

- Manual: login/logout flow for admin and employee.
- Manual: role-based access (employee blocked from admin routes).
- Manual: deactivated user login attempt fails.
- Optional: integration test for auth middleware redirect.

---

## Phase 2: Product Categories

### Objective

Deliver the category hierarchy as the first catalog building block, establishing CRUD patterns reused by products and other modules.

### Functionality

- Create, edit, archive categories.
- Parent/child hierarchy (one level deep for MVP UI; schema supports deeper nesting).
- Category list with search and tree/list view.
- Reorder categories (display order field).

### Database Impact

- `categories` table: `id`, `organization_id`, `name`, `slug`, `parent_id`, `sort_order`, `is_active`, timestamps.
- Unique constraint on `(organization_id, slug)`.
- RLS: org isolation; admin write, employee read.
- Index on `(organization_id, parent_id)`.

### Backend Impact

- Category service: CRUD operations with validation.
- Server Actions: create, update, archive category.
- Zod schemas for category input.
- Slug generation from name.

### Frontend Impact

- Categories list page with search.
- Create/edit category dialog with parent selector.
- Archive confirmation dialog.
- Empty state when no categories exist.

### Acceptance Criteria

- [ ] Admin can create root and child categories.
- [ ] Category names must be unique among siblings.
- [ ] Archived categories hidden from default list but preserved in database.
- [ ] Employee can view categories but not create/edit/archive.
- [ ] Build passes; no regressions in auth.

### Testing Requirements

- Manual: full CRUD cycle for categories.
- Manual: hierarchy display (parent → child).
- Manual: employee read-only access verified.
- Unit test: category validation schema (duplicate slug, empty name).

---

## Phase 3: Products and Variants

### Objective

Implement the product catalog with variants, SKU, and barcode — the foundation for all inventory, sales, and purchase operations.

### Functionality

- Create, edit, archive products.
- Assign product to category.
- Product fields: name, description, unit of measure, base cost price, base sale price, status.
- Add/edit/remove variants per product.
- Variant fields: name, SKU (required, unique), barcode (optional, unique), cost/sale price overrides, reorder point.
- Search products by name, SKU, barcode.
- Product detail page showing variants.

### Database Impact

- `products` table: org, category_id, name, description, unit_of_measure, cost_price, sale_price, status, timestamps.
- `product_variants` table: product_id, name, sku, barcode, cost_price, sale_price, reorder_point, is_active, timestamps.
- Unique: `(organization_id, sku)`, `(organization_id, barcode) WHERE barcode IS NOT NULL`.
- RLS: org isolation; admin write, employee read.
- Indexes for search (name, sku, barcode).

### Backend Impact

- Product service: CRUD with variant management in transactions.
- Server Actions: create/update/archive product; manage variants.
- Zod schemas with SKU/barcode uniqueness validation (server-side check).
- Search/query functions with pagination.

### Frontend Impact

- Products list page: table with search, filters (category, status), pagination.
- Product create/edit form (multi-section: details + variants).
- Variant inline editor (add/remove rows).
- Product detail page.
- Barcode and SKU displayed with copy-to-clipboard.

### Acceptance Criteria

- [ ] Admin can create product with multiple variants.
- [ ] Duplicate SKU rejected with clear error.
- [ ] Duplicate barcode rejected when provided.
- [ ] Product search returns matches by name, SKU, and barcode.
- [ ] Archived products excluded from default list.
- [ ] Employee can search and view products but not edit.
- [ ] Simple product (one default variant) works correctly.

### Testing Requirements

- Manual: create product with 3 variants; verify SKU uniqueness error.
- Manual: search by SKU and barcode.
- Unit tests: product/variant validation schemas.
- Integration test: create product with variants in single transaction.

---

## Phase 4: Warehouses and Inventory Core

### Objective

Establish the inventory ledger system — balances, movements, and the core RPC that all stock-changing operations will use. This is the most critical phase.

### Functionality

- Default warehouse seeded for MVP.
- Admin: manage warehouse metadata (name, code, address).
- View inventory balances (variant × warehouse grid/list).
- View movement history with filters (variant, type, date range, warehouse).
- Record initial stock (onboarding existing inventory).
- Stock adjustments with mandatory reason.
- Record damaged and lost inventory with mandatory notes.
- Real-time validation preventing negative stock.

### Database Impact

- `warehouses` table: org, name, code, address, is_default, is_active.
- `inventory_balances` table: warehouse_id, product_variant_id, quantity_on_hand; UNIQUE (warehouse_id, product_variant_id); CHECK (quantity_on_hand >= 0).
- `inventory_movements` table: org, warehouse_id, product_variant_id, movement_type, quantity, unit_cost, reference_type, reference_id, notes, created_by, idempotency_key, created_at.
- `stock_adjustments` table: header with reason, status, created_by (links to movements).
- PostgreSQL function: `record_inventory_movement(...)` — locks balance row, validates, inserts movement, updates balance.
- RLS: org isolation; admin write movements, employee read.
- Indexes on movements for history queries.

### Backend Impact

- `InventoryService` wrapping RPC calls.
- Server Actions: record initial stock, create adjustment, record damage, record loss.
- Movement type enum and validation.
- Query services: balances list, movement history (paginated).
- Concurrency: all stock changes go through `record_inventory_movement` RPC.

### Frontend Impact

- Warehouses settings page (admin).
- Inventory overview page: balances table with low-stock highlighting.
- Movement history page with filters.
- Initial stock entry dialog.
- Adjustment form (variant, warehouse, quantity +/-, reason).
- Damage/loss form (variant, warehouse, quantity, notes).
- Inventory detail drawer for a variant (balance + recent movements).

### Acceptance Criteria

- [ ] Default warehouse exists and is used for all operations.
- [ ] Initial stock entry creates movement and updates balance.
- [ ] Adjustment with reason updates balance correctly (+ and −).
- [ ] Damage/loss reduces balance with correct movement type.
- [ ] Attempting to reduce below zero fails with clear error.
- [ ] Movement history shows all operations with user and timestamp.
- [ ] Concurrent adjustment attempts do not produce negative stock (manual or scripted test).
- [ ] No API or UI allows direct balance editing without movement.

### Testing Requirements

- **Critical:** integration test for `record_inventory_movement` RPC (happy path + insufficient stock).
- **Critical:** concurrency test — two simultaneous decrements; only one succeeds if stock allows one.
- Manual: full initial stock → adjustment → damage flow.
- Manual: movement history filters work correctly.
- Unit tests: movement type validation, quantity sign rules.

---

## Phase 5: Suppliers and Purchase Orders

### Objective

Enable the purchasing workflow from supplier management through purchase order creation and goods receiving, with inventory increasing via purchase receipt movements.

### Functionality

- CRUD suppliers (name, contact, email, phone, tax ID, notes, status).
- Create purchase orders with supplier, warehouse, line items (variant, qty, unit cost).
- PO statuses: draft → ordered → partially received → received → cancelled.
- Receive goods: enter received quantities per line (partial receiving supported).
- Receiving creates purchase receipt and inventory movements.
- PO list with status filters; PO detail with receipt history.

### Database Impact

- `suppliers` table.
- `purchase_orders`, `purchase_order_items` tables.
- `purchase_receipts`, `purchase_receipt_items` tables.
- PostgreSQL function: `receive_purchase(...)` — validates PO, creates receipt, creates movements, updates balances and PO status.
- Document number sequence for PO numbers.
- RLS and indexes.

### Backend Impact

- Supplier service CRUD.
- Purchase service: create/update PO, mark ordered, cancel.
- Receive service calling `receive_purchase` RPC.
- Validation: received qty ≤ remaining ordered qty.
- Server Actions for all operations.

### Frontend Impact

- Suppliers list and create/edit pages.
- Purchase orders list with status badges.
- PO create/edit form with line item editor.
- PO detail page with receive goods action.
- Receive dialog: enter quantities per line, confirm.
- Receipt history on PO detail.

### Acceptance Criteria

- [ ] Admin can create supplier and purchase order.
- [ ] PO can be marked as ordered.
- [ ] Partial receiving updates inventory and PO status to partially received.
- [ ] Full receiving updates status to received.
- [ ] Each receipt creates `purchase_receipt` movements with unit cost.
- [ ] Cannot receive more than ordered quantity (without admin override if implemented).
- [ ] Cancelled PO cannot be received.
- [ ] Inventory balance reflects received quantities.

### Testing Requirements

- Integration test: create PO → receive partial → verify balance → receive remainder → verify status.
- Manual: full purchase flow from draft to received.
- Unit test: receive validation (over-receive rejected).

---

## Phase 6: Customers and Sales

### Objective

Implement the sales workflow so employees can sell products with automatic inventory deduction through sale movements.

### Functionality

- CRUD customers (name, email, phone, tax ID, notes).
- Create sales: select customer (optional), add line items (variant, qty, price).
- Draft sales (no inventory impact).
- Complete sale: validate stock, snapshot prices, create sale movements (−qty).
- Sale list with search (customer, date, sale number).
- Sale detail/receipt view.
- Cancel draft sale.

### Database Impact

- `customers` table.
- `sales`, `sale_items` tables with price snapshots.
- PostgreSQL function: `complete_sale(...)` — lock balances, validate stock, insert sale + items + movements, update balances.
- Document number sequence for sale numbers.
- RLS and indexes.

### Backend Impact

- Customer service CRUD.
- Sales service: create draft, add/remove items, complete, cancel draft.
- Price snapshot logic at completion.
- Discount validation (if implemented in this phase).
- Server Actions for all operations.

### Frontend Impact

- Customers list and create/edit pages.
- Sales list with search and date filters.
- Point-of-sale style sale create page: product search, line items, totals.
- Sale detail/receipt page (print-friendly layout optional).
- Insufficient stock error displayed per line item.

### Acceptance Criteria

- [ ] Employee can create and complete a sale.
- [ ] Completing sale decrements inventory via sale movements.
- [ ] Sale fails if any line exceeds available stock.
- [ ] Prices on sale items reflect values at completion time (not affected by later price changes).
- [ ] Draft sale can be edited and cancelled without inventory impact.
- [ ] Sale search by customer name and sale number works.
- [ ] Admin and employee can both complete sales.

### Testing Requirements

- **Critical:** integration test for `complete_sale` RPC (success + insufficient stock).
- Manual: create sale → verify inventory decreased → verify movement recorded.
- Manual: attempt oversell → verify rejection.
- Unit test: price snapshot logic.

---

## Phase 7: Returns

### Objective

Process customer returns with correct inventory restoration (restockable) or damage routing (non-restockable).

### Functionality

- Initiate return from completed sale.
- Select items and quantities to return (partial returns supported).
- Specify restockable vs damaged per line.
- Restockable returns create `sale_return` movements (+qty).
- Damaged returns create `damage` movements (no sellable stock increase).
- Return history linked to original sale.
- Sale status updates to partially returned or fully returned.

### Database Impact

- `returns`, `return_items` tables.
- PostgreSQL function: `process_return(...)` — validates against original sale, creates return + movements.
- Update sale status logic.
- RLS and indexes.

### Backend Impact

- Return service calling `process_return` RPC.
- Validation: returned qty ≤ sold qty − prior returns.
- Server Actions: create and process return.

### Frontend Impact

- Return initiation from sale detail page.
- Return form: select items, quantities, restockable/damaged toggle.
- Return confirmation and receipt view.
- Return history on sale detail.

### Acceptance Criteria

- [ ] Partial return of one line item works correctly.
- [ ] Restockable return increases sellable inventory.
- [ ] Damaged return does not increase sellable inventory.
- [ ] Cannot return more than originally sold.
- [ ] Multiple partial returns accumulate correctly.
- [ ] Return movements linked to return record and original sale.

### Testing Requirements

- Integration test: sale → return restockable → verify balance restored.
- Integration test: sale → return damaged → verify balance unchanged (sellable).
- Manual: partial return flow.
- Unit test: return quantity validation.

---

## Phase 8: Dashboard and Reports

### Objective

Provide operational visibility through a dashboard and exportable reports for inventory, sales, and purchases.

### Functionality

- Dashboard: total products, total variants, low-stock count, today's sales count/total, recent movements, recent sales.
- Inventory valuation report (qty × cost).
- Low-stock report (variants at or below reorder point).
- Sales summary report (date range, totals, by day).
- Purchase summary report (date range, totals).
- Movement history export (CSV).
- Print-friendly report views.

### Database Impact

- SQL views: `v_inventory_status`, `v_low_stock`, `v_sales_summary`, `v_purchase_summary`.
- Optional: indexes to support report queries if not already covered.

### Backend Impact

- Report query services (parameterized date range, org scope).
- CSV export Route Handler.
- Dashboard aggregation queries (optimized).
- Caching strategy for dashboard tiles (short TTL).

### Frontend Impact

- Dashboard page with metric cards and recent activity lists.
- Reports section in navigation.
- Report pages with date range picker and data tables.
- Export CSV button.
- Low-stock report with link to product/variant.

### Acceptance Criteria

- [ ] Dashboard loads within 3 seconds with seeded data.
- [ ] Low-stock report matches variants where balance ≤ reorder point.
- [ ] Sales summary totals match sum of completed sales in date range.
- [ ] CSV export downloads correct data.
- [ ] Employee sees dashboard but not admin-only reports (if restricted).
- [ ] Reports respect organization scope.

### Testing Requirements

- Manual: verify dashboard metrics against known seed data.
- Manual: CSV export opens correctly in spreadsheet app.
- Unit test: date range validation for reports.
- Optional: snapshot test for report query results with fixture data.

---

## Phase 9: Low-Stock Alerts and Audit Log

### Objective

Add proactive low-stock visibility in-app and a searchable audit log for sensitive operations.

### Functionality

- In-app alert banner/badge on dashboard when low-stock items exist.
- Low-stock count in sidebar navigation.
- Audit log: records user/role changes, price changes, product archive, sale cancellation (if allowed), settings changes.
- Admin: searchable audit log (user, action, entity, date range).
- All inventory movements already auditable via movement history (Phase 4).

### Database Impact

- `audit_logs` table: org, user_id, action, entity_type, entity_id, old_values, new_values, created_at.
- Triggers or application-level inserts on sensitive operations.
- RLS: admin read only.
- Index on `(organization_id, created_at DESC)`.

### Backend Impact

- Audit service: `log(action, entity, old, new)`.
- Integrate audit calls into existing services (product update, user role change, etc.).
- Low-stock count query (reuse report view).
- Server Action/query for audit log search.

### Frontend Impact

- Dashboard alert component for low-stock.
- Sidebar badge with low-stock count.
- Audit log page (admin only) with filters and pagination.
- Audit entry detail showing old/new values diff.

### Acceptance Criteria

- [ ] Low-stock alert appears when items are below reorder point.
- [ ] Alert clears when stock is replenished above reorder point.
- [ ] Product price change creates audit log entry with old and new values.
- [ ] User role change creates audit log entry.
- [ ] Admin can search audit log by user and date.
- [ ] Employee cannot access audit log.

### Testing Requirements

- Manual: reduce stock below reorder point → verify alert → restock → verify alert clears.
- Manual: change product price → verify audit entry.
- Unit test: audit log entry creation.

---

## Phase 10: n8n Integration and Notifications

### Objective

Enable secure automation via n8n for read-only data access and notification delivery without compromising inventory integrity.

### Functionality

- Organization-scoped API keys (admin generates, revokes).
- API endpoints:
  - `GET /api/v1/inventory/low-stock` — list low-stock items.
  - `GET /api/v1/reports/daily-sales` — sales summary for date.
  - `GET /api/v1/health` — health check.
- API key authentication middleware.
- Rate limiting on API routes.
- n8n workflow examples documented in `/docs/automations.md`:
  - Daily low-stock WhatsApp notification.
  - Daily sales summary email.
- Webhook endpoint for future write automations (disabled or no-op in MVP).

### Database Impact

- `api_keys` table: org, name, key_hash, scopes, is_active, created_by, expires_at.
- Optional: `notification_events` table for outbound event queue.

### Backend Impact

- API key generation (hash stored, plain shown once).
- API key validation middleware.
- Read-only route handlers for inventory and reports.
- Rate limiter (in-memory or Upstash Redis future).
- Audit log for API key create/revoke.

### Frontend Impact

- Settings → API Keys page (admin): create, view (masked), revoke keys.
- Documentation links to n8n setup guide.

### Frontend Impact (n8n — external)

- n8n workflows configured per `/docs/automations.md`.
- WhatsApp Business API credentials in n8n (not in Inventario Pro).

### Acceptance Criteria

- [ ] Admin can generate API key with read scopes.
- [ ] Valid API key returns low-stock data.
- [ ] Invalid or revoked key returns 401.
- [ ] n8n workflow successfully fetches low-stock and sends test notification.
- [ ] No API endpoint allows direct balance mutation.
- [ ] Rate limiting returns 429 when exceeded.

### Testing Requirements

- Integration test: API key auth (valid, invalid, revoked).
- Manual: n8n workflow end-to-end with test WhatsApp/email.
- Security review: confirm no write access without domain service.

---

## Phase 11: Warehouse Transfers and Multi-Warehouse UI

### Objective

Extend inventory operations to support multiple warehouses and inter-warehouse transfers without schema changes.

### Functionality

- Admin: create additional warehouses.
- Warehouse selector on sales, purchases, adjustments (default pre-selected).
- Inventory balances view filterable by warehouse.
- Transfer stock between warehouses (creates paired transfer_out / transfer_in movements).
- Transfer history and status.

### Database Impact

- No new tables (schema already supports warehouse_id).
- PostgreSQL function: `transfer_inventory(...)` — paired movements in one transaction.
- Remove single-warehouse assumptions in views if any.

### Backend Impact

- Transfer service calling `transfer_inventory` RPC.
- Update existing services to accept warehouse_id parameter explicitly.
- Validation: source warehouse has sufficient stock.

### Frontend Impact

- Warehouse selector component (reusable).
- Transfer create form: source, destination, variant, quantity.
- Transfer list/history page.
- Multi-warehouse inventory overview.

### Acceptance Criteria

- [ ] Admin can create second warehouse.
- [ ] Transfer deducts source and adds to destination atomically.
- [ ] Transfer fails if source has insufficient stock.
- [ ] Both transfer movements appear in history.
- [ ] Sales and purchases can target specific warehouses.
- [ ] Balances are correct per warehouse after transfer.

### Testing Requirements

- Integration test: transfer between warehouses (success + insufficient stock).
- Manual: two-warehouse transfer flow.
- Manual: sale from non-default warehouse decrements correct balance.

---

## Future Phases (Post-MVP)

These phases are planned but not scheduled for initial delivery. Architecture supports them without breaking changes.

### Phase 12: Multi-Branch Support

- `branches` table; branch-scoped warehouses, users, and reports.
- Branch manager role.
- Consolidated admin view across branches.

### Phase 13: Granular Permissions

- `permissions` and `role_permissions` tables.
- Custom roles beyond Admin/Employee.
- Permission management UI.

### Phase 14: E-Commerce Integration

- Webhook API for external order ingestion.
- Order → draft sale → complete sale pipeline.
- Idempotency for duplicate order prevention.
- Stock sync endpoint for storefront.

### Phase 15: Mobile Application

- API-first refinements for mobile clients.
- Barcode scanning via device camera.
- Supabase mobile auth.
- Offline queue (long-term).

### Phase 16: Advanced Costing and Valuation

- Weighted average cost or FIFO costing method.
- Cost recalculation on receipt.
- Historical valuation reports.

### Phase 17: Advanced Analytics

- Sales trends, ABC analysis, turnover rates.
- Materialized views refreshed by n8n schedule.
- Chart visualizations on dashboard.

---

## Phase Dependency Graph

```
Phase 0 (Foundation)
    └── Phase 1 (Auth & Users)
            └── Phase 2 (Categories)
                    └── Phase 3 (Products & Variants)
                            └── Phase 4 (Inventory Core) ◀── CRITICAL
                                    ├── Phase 5 (Purchases)
                                    ├── Phase 6 (Sales)
                                    │       └── Phase 7 (Returns)
                                    └── Phase 11 (Transfers)
                            └── Phase 8 (Dashboard & Reports)
                                    └── Phase 9 (Alerts & Audit)
                                            └── Phase 10 (n8n)
```

Phases 5 and 6 can be developed in parallel after Phase 4 if team capacity allows, but Phase 4 must be complete and stable first.

---

## Definition of Done (Every Phase)

Before marking a phase complete:

1. All acceptance criteria checked.
2. Testing requirements executed and passing.
3. `npm run build` succeeds.
4. No regressions in prior phases (smoke test auth + last completed feature).
5. RLS policies verified for new tables.
6. Server-side authorization verified (not just UI hiding).
7. Loading, empty, and error states implemented for new UI.
8. Changes documented if architecture deviates from `/docs/architecture.md`.
9. User informed of what changed and how to test.
10. Development stops until user approves next phase.

---

## MVP Scope Summary

The **Minimum Viable Product** includes Phases **0 through 10**:

| Capability | Phase |
|------------|-------|
| Authentication and roles | 1 |
| Product catalog with variants | 2, 3 |
| Inventory with full traceability | 4 |
| Purchases and receiving | 5 |
| Sales | 6 |
| Returns | 7 |
| Dashboard and reports | 8 |
| Alerts and audit | 9 |
| n8n automation | 10 |

Phases 11+ extend the product for multi-warehouse UI, multi-branch, e-commerce, and mobile without re-architecting the inventory ledger.
