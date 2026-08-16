# Inventario Pro — Architecture

## 1. Architecture Overview

Inventario Pro is a full-stack inventory management application built as a **Next.js monolith** with **Supabase** as the backend platform (PostgreSQL, Auth, RLS). Business logic for sensitive operations lives on the server; the database enforces integrity constraints and access policies.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
│  Browser (Next.js UI)  │  Future: Mobile App  │  n8n Automations            │
└────────────┬───────────────────────────┬──────────────────┬─────────────────┘
             │                           │                  │
             ▼                           ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APPLICATION (Vercel)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ App Router   │  │ Server       │  │ Route        │  │ Server Actions  │ │
│  │ (RSC + Pages)│  │ Components   │  │ Handlers     │  │ (mutations)     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Domain Services (inventory, sales, purchases, auth, audit)             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SUPABASE                                         │
│  ┌─────────────┐  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │ Supabase    │  │ PostgreSQL          │  │ Edge Functions (optional)    │ │
│  │ Auth        │  │ + RLS Policies      │  │                              │ │
│  └─────────────┘  │ + DB Functions      │  └──────────────────────────────┘ │
│                   │ + Triggers            │                                   │
│                   └─────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES (Future / Automation)                  │
│  n8n  │  WhatsApp Business API  │  E-commerce platforms  │  Email (SMTP)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Architectural Principles

1. **Inventory integrity first** — movements are authoritative; balances are transactional derivatives.
2. **Server-side trust boundary** — never trust client for auth, roles, prices, or quantities.
3. **Vertical slices** — each feature ships database + backend + frontend together.
4. **Progressive complexity** — MVP is single-org, single-warehouse; schema anticipates multi-branch.
5. **Automation as a consumer** — n8n reads and triggers; it does not own inventory state.
6. **Audit by default** — sensitive mutations produce audit and movement records.

### 1.2 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js Server Actions, Route Handlers, domain service modules |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (SSR cookie sessions) |
| Hosting | Vercel (app), Supabase (database) |
| Automation | n8n (webhooks, scheduled jobs, notifications) |
| CI/CD | GitHub → Vercel preview/production deployments |

---

## 2. Application Modules

The application is organized into domain modules. Each module owns its types, validation schemas, server services, and UI routes.

| Module | Responsibility |
|--------|----------------|
| **auth** | Login, logout, session, profile, password reset |
| **users** | User management, role assignment, activation |
| **organizations** | Org settings, timezone, currency (MVP: single org) |
| **catalog** | Products, categories, variants, SKU, barcode |
| **warehouses** | Warehouse definitions, default warehouse |
| **inventory** | Balances, movements, adjustments, damage, loss, transfers |
| **purchasing** | Suppliers, purchase orders, receiving |
| **sales** | Customers, sales, sale items, pricing snapshots |
| **returns** | Sale returns, restock routing |
| **reporting** | Reports, exports, dashboard aggregates |
| **alerts** | Low-stock detection, notification triggers |
| **audit** | Audit log, activity history |
| **integrations** | n8n webhooks, API keys, automation endpoints |

### 2.1 Directory Structure (Target)

```
app/
  (auth)/login, register, ...
  (dashboard)/dashboard, products, inventory, ...
  api/                    # Route handlers (webhooks, exports, n8n)
components/
  ui/                     # shadcn/ui primitives
  layout/                 # Shell, sidebar, header
  [module]/               # Module-specific components
lib/
  supabase/               # Client factories (browser, server, admin)
  auth/                   # Session helpers, role checks
  validations/            # Zod schemas
services/                 # Domain services (pure business logic)
  inventory/
  sales/
  purchases/
  ...
types/                    # Shared TypeScript types
supabase/
  migrations/             # SQL migrations
  seed.sql                # Dev seed data
docs/                     # Architecture and requirements
```

---

## 3. Frontend Responsibilities

The frontend provides the user interface and delegates all authoritative operations to the server.

### 3.1 Responsibilities

- Render responsive UI with shadcn/ui components.
- Fetch data via Server Components where possible; use client components for interactivity.
- Submit mutations through Server Actions or typed API calls.
- Display loading, empty, and error states.
- Client-side form validation for UX (mirrors server schemas).
- Role-aware navigation and conditional UI (not security enforcement).
- Barcode scanning input support (keyboard wedge; camera scanning future).

### 3.2 Patterns

| Pattern | Usage |
|---------|-------|
| Server Components | List pages, dashboards, read-only detail views |
| Client Components | Forms, dialogs, interactive tables, filters |
| Server Actions | Create/update/delete mutations with revalidation |
| React Hook Form + Zod | Form state and validation |
| URL search params | Filters, pagination, sort state |

### 3.3 What the Frontend Must NOT Do

- Mutate inventory balances directly.
- Trust role or permission flags from local storage.
- Store secrets or service role keys.
- Calculate final prices or discounts without server confirmation.
- Bypass movement creation for stock changes.

---

## 4. Backend Responsibilities

The backend (Next.js server layer + PostgreSQL) is the **trust boundary**.

### 4.1 Responsibilities

- Authenticate requests via Supabase session.
- Authorize every mutation by role and permission.
- Validate all inputs with Zod (or equivalent).
- Execute domain logic in service modules.
- Perform inventory operations inside PostgreSQL transactions.
- Write audit records for sensitive changes.
- Expose Route Handlers for webhooks, exports, and n8n integration.
- Return structured errors (validation, authorization, conflict, insufficient stock).

### 4.2 Service Layer Pattern

```
Route Handler / Server Action
        │
        ▼
   Auth + Authz middleware
        │
        ▼
   Input validation (Zod)
        │
        ▼
   Domain Service (e.g., InventoryService.recordSale)
        │
        ▼
   Database transaction (movements + balances + document)
        │
        ▼
   Audit log (if applicable)
```

Domain services are unit-testable and contain business rules. They call Supabase server client or raw SQL via RPC for transactional operations.

### 4.3 Critical Server Functions

Inventory mutations should prefer **PostgreSQL functions** (RPC) for atomicity when multiple tables are involved:

- `record_inventory_movement(...)` — core primitive; all stock changes flow through this.
- `complete_sale(...)` — validates stock, creates sale + items + movements.
- `receive_purchase(...)` — creates receipt + movements.
- `process_return(...)` — creates return + movements.

Server Actions call these RPCs rather than performing multi-step client-side database operations.

---

## 5. Database Responsibilities

PostgreSQL (via Supabase) is the **system of record**.

### 5.1 Core Responsibilities

- Persist all business entities with referential integrity.
- Enforce constraints (unique SKU, non-negative balance, FK relationships).
- Enforce Row Level Security (RLS) per organization and role.
- Provide transactional guarantees for inventory operations.
- Store immutable movement and audit records.
- Support indexed queries for search, reporting, and dashboards.

### 5.2 Entity Groups

**Identity and access**

- `organizations`
- `profiles` (extends Supabase auth.users)
- `user_roles` or role column on profiles

**Catalog**

- `categories`
- `products`
- `product_variants` (SKU, barcode, prices)

**Inventory**

- `warehouses`
- `inventory_balances` (variant + warehouse → quantity_on_hand)
- `inventory_movements` (immutable ledger)
- `stock_adjustments` (adjustment header linked to movements)

**Purchasing**

- `suppliers`
- `purchase_orders`, `purchase_order_items`
- `purchase_receipts`, `purchase_receipt_items`

**Sales**

- `customers`
- `sales`, `sale_items`
- `returns`, `return_items`

**Operations**

- `audit_logs`
- `notification_events` (optional queue for n8n)

### 5.3 Key Constraints

```sql
-- Example constraints (conceptual)
UNIQUE (organization_id, sku) ON product_variants
UNIQUE (organization_id, barcode) ON product_variants WHERE barcode IS NOT NULL
UNIQUE (warehouse_id, product_variant_id) ON inventory_balances
CHECK (quantity_on_hand >= 0) ON inventory_balances
-- Movements: no UPDATE/DELETE policies for regular users
```

### 5.4 Indexing Strategy

- `inventory_balances (warehouse_id, product_variant_id)` — primary lookup.
- `inventory_movements (organization_id, created_at DESC)` — history queries.
- `inventory_movements (product_variant_id, warehouse_id, created_at DESC)` — variant history.
- `product_variants (organization_id, sku)` — SKU lookup.
- `sales (organization_id, created_at DESC)` — sales list.

---

## 6. Authentication Strategy

### 6.1 Provider

**Supabase Auth** with email/password for MVP. OAuth providers (Google) can be added later without architectural change.

### 6.2 Session Management

- Use `@supabase/ssr` for cookie-based sessions in Next.js App Router.
- Server Components and Server Actions read session from cookies via server client.
- Middleware (`middleware.ts`) refreshes session and protects dashboard routes.

### 6.3 User Profile Linkage

```
auth.users (Supabase)
    │
    └── profiles (public schema)
            ├── organization_id
            ├── full_name
            ├── role (admin | employee)
            └── is_active
```

On signup/first login, a profile row is created (via trigger or server action). `profiles.id` matches `auth.users.id`.

### 6.4 Flow

1. User submits login form → Supabase Auth signIn.
2. Session cookie set → middleware validates on subsequent requests.
3. Server loads profile + role → attaches to request context.
4. RLS policies use `auth.uid()` and profile organization/role.

---

## 7. Authorization Strategy

### 7.1 Defense in Depth

| Layer | Mechanism |
|-------|-----------|
| UI | Hide/disable actions based on role (UX only) |
| Server Actions / API | Role check before executing service |
| Domain Services | Permission checks for specific operations |
| PostgreSQL RLS | Row-level read/write restrictions |
| Database grants | Restrict direct access; app uses scoped roles |

### 7.2 MVP Role Matrix (Simplified)

| Resource | Admin | Employee |
|----------|-------|----------|
| Products/Categories | CRUD | Read |
| Inventory balances | Read | Read |
| Adjustments/Damage/Loss | CRUD | — (configurable) |
| Sales | CRUD | Create/Read/Complete |
| Returns | CRUD | Create/Read |
| Purchases | CRUD | Read (+ draft optional) |
| Suppliers/Customers | CRUD | Read |
| Users/Roles | CRUD | — |
| Reports | All | Operational |
| Audit log | Read | — |

### 7.3 Future Granular Permissions

Introduce `permissions` and `role_permissions` tables:

```
permissions: (resource, action) e.g., ('inventory', 'adjust')
role_permissions: (role_id, permission_id)
```

MVP uses enum role on profile; migration path preserves existing roles.

### 7.4 RLS Policy Pattern

```sql
-- Conceptual: users see only their organization's data
CREATE POLICY org_isolation ON products
  FOR ALL USING (organization_id = get_user_organization_id());

-- Admin-only write on sensitive tables
CREATE POLICY admin_write ON user_roles
  FOR INSERT WITH CHECK (is_admin());
```

Helper functions `get_user_organization_id()` and `is_admin()` are `SECURITY DEFINER` and stable.

---

## 8. Inventory Architecture

Inventory is the most critical domain. The design ensures **full traceability** and **concurrency safety**.

### 8.1 Core Model

```
product_variants ──┐
                   ├──▶ inventory_balances ◀── warehouses
                   │
                   └──▶ inventory_movements (ledger)
                              │
                              ├── sale / sale_item
                              ├── purchase_receipt / item
                              ├── stock_adjustment
                              ├── return / return_item
                              └── transfer (future)
```

### 8.2 Balance vs Movement

| Table | Purpose | Mutability |
|-------|---------|------------|
| `inventory_movements` | Audit ledger of every quantity change | Insert-only |
| `inventory_balances` | Current on-hand for fast reads | Updated only via movement transaction |

**Never** expose `inventory_balances.quantity_on_hand` as directly editable.

### 8.3 Movement Record Structure

| Field | Description |
|-------|-------------|
| id | UUID primary key |
| organization_id | Tenant scope |
| warehouse_id | Warehouse scope |
| product_variant_id | Which SKU |
| movement_type | Enum (see requirements) |
| quantity | Signed integer (+ in, − out) |
| unit_cost | Optional; set on receipts |
| reference_type | Polymorphic link type |
| reference_id | Polymorphic link ID |
| notes | Required for adjustment/damage/loss |
| created_by | User who performed action |
| created_at | Timestamp |
| idempotency_key | Optional; for API/automation |

### 8.4 Transaction Flow (Sale Example)

```
BEGIN;
  -- 1. Lock balance rows for all sale line variants
  SELECT quantity_on_hand FROM inventory_balances
    WHERE warehouse_id = $1 AND product_variant_id = ANY($2)
    FOR UPDATE;

  -- 2. Validate sufficient stock for each line
  -- 3. Insert sale + sale_items
  -- 4. For each line: insert movement (type=sale, quantity=-N)
  -- 5. Update inventory_balances
  -- 6. Insert audit log entry
COMMIT;
```

If any step fails, entire transaction rolls back — no partial inventory changes.

### 8.5 Adjustment, Damage, and Loss

These are movement types with mandatory metadata:

- **Adjustment (+/−):** `stock_adjustments` header with reason; one or more movements.
- **Damage:** movement type `damage`; reduces sellable stock; notes required.
- **Loss:** movement type `loss`; same as damage but semantic distinction for reporting.

### 8.6 Transfers (Future-Ready)

Warehouse-to-warehouse transfer creates paired movements:

- `transfer_out` (−qty) from source warehouse
- `transfer_in` (+qty) to destination warehouse

Both in one transaction. MVP may omit UI but schema supports it.

### 8.7 Reorder Points and Low Stock

`product_variants.reorder_point` (or per-warehouse override table later). Low-stock query:

```sql
SELECT * FROM inventory_balances b
JOIN product_variants v ON ...
WHERE b.quantity_on_hand <= v.reorder_point;
```

---

## 9. Sales Architecture

### 9.1 Document Model

```
sales
  ├── customer_id (optional)
  ├── warehouse_id
  ├── status (draft | completed | cancelled)
  ├── subtotal, discount, total
  ├── document_number
  └── sale_items[]
        ├── product_variant_id
        ├── quantity
        ├── unit_price (snapshot)
        ├── discount
        └── line_total
```

### 9.2 Lifecycle

1. **Draft** — no inventory impact; editable.
2. **Completed** — inventory movements created; immutable except via returns.
3. **Cancelled** — only from draft; completed sales require return flow.

### 9.3 Pricing

- Unit prices copied from variant at time of sale completion.
- Discounts validated server-side against role limits.
- Tax calculation (future) appended as separate line items.

### 9.4 Integration Points

- Inventory module: `complete_sale` creates movements.
- Audit module: logs completion and cancellations.
- Reporting module: aggregates completed sales.

---

## 10. Purchasing Architecture

### 10.1 Document Model

```
suppliers
purchase_orders
  ├── supplier_id
  ├── warehouse_id (destination)
  ├── status (draft | ordered | partially_received | received | cancelled)
  └── purchase_order_items[]
        ├── product_variant_id
        ├── quantity_ordered
        ├── unit_cost
        └── quantity_received (tracked)

purchase_receipts
  ├── purchase_order_id
  └── purchase_receipt_items[]
        ├── purchase_order_item_id
        ├── quantity_received
        └── unit_cost (actual)
```

### 10.2 Receiving Flow

1. User selects PO → enters received quantities per line.
2. Server validates against remaining ordered quantity.
3. Transaction: insert receipt → insert `purchase_receipt` movements (+qty) → update balances → update PO item received counts → update PO status.
4. Unit cost on movement taken from receipt line.

### 10.3 Cost and Valuation

MVP uses **latest receipt cost** or **variant cost price** for valuation reports. Weighted average or FIFO can be added later without breaking movement history.

---

## 11. Reporting Architecture

### 11.1 Approach

| Report Type | Implementation |
|-------------|----------------|
| Dashboard metrics | Server Components + aggregated SQL queries |
| Inventory valuation | SQL view: `balance × cost` |
| Low stock | Filtered query against reorder points |
| Sales/Purchase summaries | Date-range aggregation on completed documents |
| Movement history | Paginated query on `inventory_movements` |
| Exports (CSV) | Route Handler streaming response |

### 11.2 Read Optimization

- Use SQL views for complex joins (`v_inventory_status`, `v_sales_summary`).
- Consider materialized views for heavy dashboards (refresh on schedule via n8n or pg_cron).
- Reports always filter by `organization_id`.

### 11.3 Caching

- Next.js `unstable_cache` or React `cache()` for dashboard tiles with short TTL.
- Never cache user-specific data without including user/role in cache key.
- Inventory balances are not cached client-side as authoritative.

---

## 12. Audit Strategy

### 12.1 Two-Layer Audit

| Layer | Records | Purpose |
|-------|---------|---------|
| **Inventory movements** | Every stock change | Operational traceability |
| **Audit logs** | Config/sensitive changes | Compliance and security |

### 12.2 Audit Log Events

- User created/updated/deactivated
- Role changed
- Product price/cost changed
- Sale cancelled (if allowed)
- Purchase order cancelled
- Settings changed
- API key created/revoked

### 12.3 Audit Record Structure

| Field | Description |
|-------|-------------|
| id | UUID |
| organization_id | Tenant |
| user_id | Who performed action |
| action | e.g., `product.update`, `user.role_change` |
| entity_type | Table/entity name |
| entity_id | Record ID |
| old_values | JSONB (optional) |
| new_values | JSONB (optional) |
| ip_address | Optional |
| created_at | Timestamp |

### 12.4 Immutability

Audit logs and inventory movements are append-only. Application database roles do not grant UPDATE/DELETE on these tables to application users.

---

## 13. n8n Integration Boundary

n8n is an **automation and notification layer**, not a source of truth.

### 13.1 What n8n CAN Do

| Action | Method |
|--------|--------|
| Read low-stock data | Secure API route or Supabase read-only view |
| Send WhatsApp/email notifications | n8n workflow nodes |
| Generate scheduled reports | n8n cron → API → format → deliver |
| Trigger approved workflows | Webhook to Next.js Route Handler |
| Notify external systems | HTTP nodes, webhooks |

### 13.2 What n8n MUST NOT Do

| Prohibited | Reason |
|------------|--------|
| Direct INSERT/UPDATE on `inventory_balances` | Bypasses movement ledger |
| Direct DELETE on movements | Destroys audit trail |
| Use service role key in workflows exposed to non-admin | Security risk |
| Become authoritative for stock counts | Data integrity |

### 13.3 Integration Pattern

```
┌──────────┐    webhook/cron     ┌───────────────┐    RPC/Service    ┌──────────┐
│   n8n    │ ──────────────────▶ │ Next.js API   │ ────────────────▶ │ Postgres │
│ workflow │ ◀────────────────── │ (auth + val.) │                   │ (txn)    │
└──────────┘    JSON response    └───────────────┘                   └──────────┘
```

**Read path:** n8n → API key auth → read-only endpoint → return data → notify.

**Write path (if ever needed):** n8n → API key auth → Route Handler → domain service → same transaction rules as UI.

### 13.4 API Keys

- Organization-scoped API keys stored hashed in database.
- Keys have explicit scopes: `read:inventory`, `read:reports`, `write:webhook-test`.
- Rate limiting per key.

### 13.5 WhatsApp Business

WhatsApp messages sent by n8n based on data fetched from Inventario Pro APIs. Templates for: low-stock alert, daily sales summary, purchase receipt confirmation (future).

---

## 14. Future Scalability Considerations

### 14.1 Multi-Warehouse (Near-Term)

Already supported by schema:

- All balances and movements include `warehouse_id`.
- MVP UI defaults to single warehouse; warehouse selector added when needed.
- Transfer movements already defined.

### 14.2 Multi-Branch / Multi-Tenant (Mid-Term)

```
organizations
  └── branches (optional sub-entity)
        └── warehouses
```

- Add `branch_id` to warehouses, sales, and reports.
- RLS policies extend to branch scope for branch managers.
- Central admin sees all branches; branch users see only theirs.

`organization_id` on all tables from day one prevents painful migrations.

### 14.3 E-Commerce Integration (Mid-Term)

- External storefront sends orders via webhook API.
- Orders create draft sales or dedicated `ecommerce_orders` table.
- Stock allocation uses same `complete_sale` RPC.
- Idempotency keys prevent duplicate order processing.

### 14.4 Mobile App (Long-Term)

- React Native or Flutter app consuming same Route Handlers.
- JWT or Supabase mobile auth session.
- Barcode scanning as first-class mobile feature.
- Offline mode (long-term) requires local queue + sync — not MVP.

### 14.5 Performance at Scale

| Scale | Strategy |
|-------|----------|
| 100K movements | Partition `inventory_movements` by month (future) |
| Large catalogs | Full-text search (PostgreSQL tsvector or Supabase search) |
| Heavy reporting | Materialized views + read replica |
| Global users | Multi-region Supabase (enterprise) |

### 14.6 Event-Driven Extensions (Optional Future)

Publish domain events (`sale.completed`, `stock.low`) to a queue for decoupled consumers. MVP uses direct calls; event table or Supabase Realtime can be added without changing core model.

---

## 15. Security Principles

1. **Least privilege** — users, API keys, and database roles get minimum required access.
2. **Server-side validation** — all inputs validated before database operations.
3. **RLS everywhere** — no table with business data left unprotected.
4. **Secrets isolation** — service role key only in server environment variables.
5. **Immutable audit trail** — movements and audit logs cannot be altered by application users.
6. **Transactional integrity** — inventory operations are all-or-nothing.
7. **Defense in depth** — auth at middleware, server action, service, and database layers.
8. **Secure automation** — n8n uses scoped API keys; no direct database writes.
9. **Dependency hygiene** — keep Next.js, Supabase SDK, and dependencies updated.
10. **Production hardening** — CSP headers, HTTPS, secure cookies, rate limiting on auth and API routes.

---

## 16. Deployment Architecture

```
GitHub Repository
      │
      ├── push to main ──────▶ Vercel Production
      │
      └── pull request ──────▶ Vercel Preview Deployment
                                      │
                                      ▼
                              Supabase (staging project or branch)
```

- Environment variables managed in Vercel (production) and `.env.local` (development).
- Supabase migrations applied via CLI in CI or manual promotion process.
- n8n runs independently with credentials to Inventario Pro API.

---

## 17. Related Documentation

Detailed specifications will be maintained in companion documents:

- `/docs/database.md` — full schema, migrations, RLS policies
- `/docs/backend.md` — API contracts, Server Actions, RPC definitions
- `/docs/ux-ui.md` — design system, layouts, component patterns
- `/docs/testing.md` — test strategy and coverage requirements
- `/docs/security.md` — threat model and security checklist
- `/docs/automations.md` — n8n workflow catalog

This architecture document is the top-level reference. Module-specific details belong in those companion files as they are developed.
