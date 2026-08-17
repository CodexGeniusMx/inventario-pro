# Inventario Pro — Backend Architecture

## 1. Overview

The Inventario Pro backend is the **trust boundary** between the browser and Supabase PostgreSQL. It runs inside the **Next.js App Router** server runtime (Server Components, Server Actions, Route Handlers) and delegates atomic inventory operations to **PostgreSQL RPC functions**.

### 1.1 Responsibilities

- Authenticate users via Supabase Auth (SSR cookie sessions)
- Resolve organization membership, role, and permissions from the server session — **never from client input**
- Validate all inputs with Zod
- Execute domain logic in typed service modules
- Perform inventory mutations exclusively through PostgreSQL RPCs inside single transactions
- Write audit records for sensitive changes
- Return structured, safe errors to the UI and API consumers
- Expose read-only Route Handlers for exports and n8n automation

### 1.2 Non-Negotiable Security Rules

The backend must **never trust** the following from the browser:

| Untrusted input | Server-side source of truth |
|-----------------|------------------------------|
| `userId`, `createdBy` | `auth.uid()` via session |
| `organizationId` | `profiles.organization_id` for authenticated user |
| `role`, `permissions` | `profiles.role` + `has_permission()` |
| Sale line `unitPrice`, discounts, totals | Resolved from `product_variants` / sale policy at completion |
| Purchase line `unitCost` | Stored on PO/receipt; validated on receive |
| Stock quantities, balances | Read from DB; mutations via RPC only |
| Document numbers | `next_document_number()` RPC |
| Warehouse scope (MVP) | Default warehouse from org settings or explicit validated ID in org |

Client-submitted prices may be shown in the UI for UX but are **replaced or validated** server-side before persistence.

### 1.3 Concurrency & Inventory Integrity

Two simultaneous sales for the last available unit must not produce negative stock.

**Mechanism (already deployed):**

1. `record_inventory_movement()` acquires `SELECT … FOR UPDATE` on `inventory_balances`
2. Validates `quantity_after >= 0` before commit
3. Inserts immutable `inventory_movements` row in the same transaction
4. CHECK constraint on `inventory_balances.quantity_on_hand` as final defense

All stock-changing operations (`complete_sale`, `receive_purchase`, `create_stock_adjustment`, `process_return`, `transfer_stock`) must call `record_inventory_movement()` internally — never update balances directly.

---

## 2. Backend Layer Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Browser (Client Components)                                             │
│  - UX validation only                                                   │
│  - Calls Server Actions / fetch Route Handlers                          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Middleware (middleware.ts)                                              │
│  - Refresh Supabase session                                             │
│  - Protect authenticated routes                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐
│ Server          │  │ Server Actions  │  │ Route Handlers              │
│ Components      │  │ (mutations)     │  │ /api/v1/* (exports, n8n)  │
│ (reads)         │  │                 │  │                             │
└────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘
         │                    │                          │
         └────────────────────┼──────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Server Context (`lib/auth/session.ts`)                                  │
│  - getSession(), requireUser(), requirePermission()                     │
│  - Resolves: userId, organizationId, role, profile                      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Domain Services (`services/*`)                                          │
│  - Business rules, orchestration, audit calls                           │
│  - No direct balance updates                                            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Supabase Server Client (`lib/supabase/server.ts`)                       │
│  - `.rpc()` for atomic inventory operations                             │
│  - `.from().select/insert/update()` for non-inventory CRUD              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PostgreSQL (Supabase)                                                   │
│  - RLS policies                                                         │
│  - SECURITY DEFINER RPCs                                                │
│  - `record_inventory_movement()` with row locks                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Operation Transport Matrix

| Operation category | Transport | Database access |
|--------------------|-----------|-----------------|
| Login / logout / password reset | Server Action + Supabase Auth | Auth API |
| Profile read/update (self) | Server Action | Direct query + RLS |
| User admin (invite, role, deactivate) | Server Action | Direct query + RLS + audit |
| Catalog CRUD (products, categories, variants) | Server Action | Direct queries in transaction |
| List/search/read (products, sales, inventory) | Server Component | Direct query + RLS |
| Dashboard aggregates | Server Component | Direct query / views |
| Reports & CSV export | Route Handler (`GET`) | Direct query / views |
| **Stock adjustment** | Server Action → Service → **RPC** `create_stock_adjustment` | RPC (deployed) |
| **Complete sale** | Server Action → Service → **RPC** `complete_sale` | RPC (planned migration) |
| **Receive purchase** | Server Action → Service → **RPC** `receive_purchase` | RPC (planned migration) |
| **Process return** | Server Action → Service → **RPC** `process_return` | RPC (planned migration) |
| **Transfer stock** | Server Action → Service → **RPC** `transfer_stock` | RPC (planned migration) |
| n8n / automation reads | Route Handler + API key | Direct query, read-only |
| Health check | Route Handler | Simple query |

### 3.1 When to Use Each

**Server Actions** (default for mutations)

- Called from forms and client components
- Colocated with UI routes under `app/actions/` or `services/*/actions.ts`
- Must call `requireUser()` / `requirePermission()` first
- Return `ActionResult<T>` (see §12)

**Route Handlers** (`app/api/`)

- External consumers (n8n, CSV download, webhooks)
- Streaming responses
- API key authentication
- No React revalidation — return JSON/file directly

**PostgreSQL RPC** (Supabase `.rpc()`)

- Any operation touching `inventory_balances` + `inventory_movements` atomically
- Multi-table business transactions (complete sale, receive PO, returns, transfers)
- Sequential document number generation (already in RPC)

**Direct server-side queries**

- Read-only lists and detail pages
- Simple CRUD without inventory impact (draft sale header, customer create)
- Catalog writes (product/variant upsert) — single-org transaction in service layer
- Audit log inserts (via service helper)

**Never use browser Supabase client for**

- Inventory mutations
- Admin writes
- Any authoritative price or permission check

---

## 4. Supabase Client Architecture

### 4.1 File Layout

```
lib/supabase/
  client.ts          # Browser client (auth session only, minimal reads)
  server.ts          # Server Component / Server Action client (cookies)
  middleware.ts      # Middleware session refresh helper
  admin.ts           # Service role — NEVER import in client components
types/
  database.ts        # Generated Supabase types (supabase gen types)
```

### 4.2 Browser Client (`lib/supabase/client.ts`)

**Purpose:** Auth UI flows only (login form, session subscription if needed).

```typescript
// createBrowserClient from @supabase/ssr
// Uses NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Allowed operations:**

- `signInWithPassword`, `signOut`, `resetPasswordForEmail`
- Optional: read own profile for client-side display (not for authorization)

**Forbidden:**

- Inventory writes
- Relying on client reads for security decisions

### 4.3 Server Client (`lib/supabase/server.ts`)

**Purpose:** All Server Components, Server Actions, and Route Handlers acting as the logged-in user.

```typescript
// createServerClient from @supabase/ssr
// Reads/writes cookies via next/headers
// Respects RLS as authenticated user
```

**Usage pattern:**

```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
// Always use getUser(), not getSession(), for server auth
```

### 4.4 Admin Client (`lib/supabase/admin.ts`)

**Purpose:** Server-only operations that bypass RLS when necessary (user invite bootstrap, system tasks).

```typescript
// createClient with SUPABASE_SERVICE_ROLE_KEY
// Only imported from services that cannot use user-scoped client
```

**Use sparingly:**

- Creating auth user + profile on admin invite
- Background jobs (future)
- **Not** for routine inventory mutations — those use user-scoped client calling SECURITY DEFINER RPCs

### 4.5 Type Generation

Run after migrations:

```bash
supabase gen types typescript --local > types/database.ts
```

Services import `Database` type for RPC names and table rows.

---

## 5. Middleware Responsibilities

**File:** `middleware.ts`

| Responsibility | Implementation |
|----------------|----------------|
| Session refresh | `updateSession()` from `lib/supabase/middleware.ts` |
| Protect app routes | Redirect unauthenticated users from `(app)/*` to `/login` |
| Allow public routes | `/login`, `/forgot-password`, `/reset-password`, `/api/health` |
| Pass-through | Static assets, `_next/*` |

**Middleware does NOT:**

- Load full profile or permissions (done in Server Actions / layout)
- Perform business authorization (only auth gate)
- Call inventory RPCs

**Matcher:**

```
/(app)/:path*
/login
/forgot-password
/reset-password
```

After middleware, every protected Server Action must still call `requireUser()` — defense in depth.

---

## 6. Authentication & Session Context

### 6.1 Session Helpers (`lib/auth/session.ts`)

| Function | Returns | Behavior |
|----------|---------|----------|
| `getSession()` | `{ user, profile } \| null` | Loads auth user + profile row; null if inactive |
| `requireUser()` | `AuthenticatedUser` | Throws `UnauthorizedError` if no session |
| `requireAdmin()` | `AuthenticatedUser` | Requires `role === 'admin'` |
| `requirePermission(resource, action)` | `AuthenticatedUser` | Calls DB `has_permission` via RPC or profile role map |
| `getOrganizationId()` | `uuid` | From profile only |

**`AuthenticatedUser` type:**

```typescript
type AuthenticatedUser = {
  id: string;              // auth.users.id = profiles.id
  email: string;
  fullName: string;
  organizationId: string;  // NEVER from client input
  role: 'admin' | 'employee';
  branchId: string | null;
};
```

### 6.2 Organization Membership

- One profile → one organization (MVP)
- `organizationId` always read from `profiles` where `id = auth.uid()`
- RPCs receive org ID from service layer, which got it from session — RPC validates with `assert_same_organization()`

### 6.3 Roles & Permissions

**MVP roles:** `admin`, `employee` on `profiles.role`

**Permission checks:**

1. **Server Action / Service:** `requirePermission('sales', 'complete')` before calling RPC
2. **PostgreSQL RPC:** `has_permission()` inside SECURITY DEFINER function
3. **RLS:** org isolation + admin policies on writes

**Permission catalog:** seeded in migration `00013_seed_permissions.sql`

| Resource | Actions |
|----------|---------|
| products | read, write |
| categories | read, write |
| inventory | read, adjust |
| sales | read, write, complete |
| returns | read, write |
| purchases | read, write, receive |
| suppliers | read, write |
| customers | read, write |
| users | read, write |
| reports | read |
| audit | read |
| settings | read, write |

Employees lack: `products.write`, `inventory.adjust`, `purchases.write/receive`, `users.*`, `audit.read`, `settings.*` (configurable later).

---

## 7. Domain / Service Layer

### 7.1 Directory Structure

```
services/
  auth/
    auth.service.ts
  catalog/
    product.service.ts
    category.service.ts
  inventory/
    inventory.service.ts
    adjustment.service.ts
  sales/
    sale.service.ts
    return.service.ts
  purchasing/
    purchase.service.ts
  parties/
    customer.service.ts
    supplier.service.ts
  reporting/
    dashboard.service.ts
    report.service.ts
  audit/
    audit.service.ts
lib/
  auth/
    session.ts
    permissions.ts
  validations/
    product.schema.ts
    sale.schema.ts
    ...
  errors/
    app-error.ts
    action-result.ts
```

### 7.2 Service Rules

1. Services receive `AuthenticatedUser` as first argument — never trust client identity
2. Services use Supabase server client passed in or created internally
3. Inventory-affecting methods call `.rpc()` only — no manual balance updates
4. Services throw typed `AppError` subclasses (see §12)
5. Services call `audit.service.log()` for sensitive mutations
6. No React imports in services (testable in isolation)

### 7.3 Server Action Pattern

```typescript
'use server';

export async function createProductAction(input: unknown): Promise<ActionResult<ProductDTO>> {
  try {
    const user = await requirePermission('products', 'write');
    const parsed = createProductSchema.parse(input);
    const product = await productService.create(user, parsed);
    revalidatePath('/products');
    return { success: true, data: product };
  } catch (error) {
    return toActionResult(error);
  }
}
```

---

## 8. Zod Schema Strategy

### 8.1 Location & Naming

```
lib/validations/
  common.schema.ts       # uuid, pagination, money, quantity
  product.schema.ts      # createProductSchema, updateProductSchema
  sale.schema.ts
  purchase.schema.ts
  inventory.schema.ts
  ...
```

### 8.2 Conventions

| Rule | Detail |
|------|--------|
| Single source of truth | Same schema for Server Action input parsing |
| Client mirror | Import schema in forms with `@hookform/resolvers/zod` |
| Strip unknown keys | `.strict()` on mutation schemas |
| Never include | `organizationId`, `createdBy`, `role` in client schemas |
| Money | `z.number().nonnegative().multipleOf(0.01)` or string → coerce |
| Quantity | `z.number().int().positive()` for line items |
| UUIDs | `z.string().uuid()` — validate existence in service, not schema |
| Idempotency | Optional `idempotencyKey: z.string().min(8).max(128)` on critical mutations |

### 8.3 Server-Only Enrichment

After Zod parse, service layer adds:

```typescript
{
  ...parsed,
  organizationId: user.organizationId,
  createdBy: user.id,
}
```

Prices for sale completion are **re-fetched** from DB, not taken from parsed client payload (client prices used only for draft UX with server recalculation on complete).

---

## 9. Idempotency Strategy

### 9.1 Scope

Required for:

- Complete sale
- Receive purchase
- Stock adjustment
- Process return
- Transfer stock
- Future n8n/API inventory triggers

### 9.2 Implementation

1. Client generates UUID v4 per user action (or Server Action generates if retry)
2. Passed as `idempotencyKey` to Server Action
3. Service forwards to RPC
4. RPC checks `inventory_movements (organization_id, idempotency_key)` unique partial index
5. Duplicate key returns existing movement / document ID without double mutation

**Key format:**

```
{operation}:{documentId}:{lineVariantId}   # per-line keys inside multi-line RPCs
sale:complete:{saleId}:{uuid}              # sale-level key
```

### 9.3 HTTP / Route Handlers

API consumers send `Idempotency-Key` header; Route Handler maps to RPC parameter.

---

## 10. Error Conventions

### 10.1 Error Classes (`lib/errors/app-error.ts`)

| Class | Code | HTTP | When |
|-------|------|------|------|
| `UnauthorizedError` | `UNAUTHORIZED` | 401 | No session |
| `ForbiddenError` | `FORBIDDEN` | 403 | Missing permission |
| `ValidationError` | `VALIDATION_ERROR` | 400 | Zod or business validation |
| `NotFoundError` | `NOT_FOUND` | 404 | Entity not in org |
| `ConflictError` | `CONFLICT` | 409 | Duplicate SKU, invalid state transition |
| `InsufficientStockError` | `INSUFFICIENT_STOCK` | 409 | RPC `insufficient_stock` |
| `InventoryError` | `INVENTORY_ERROR` | 409 | Other inventory failures |

### 10.2 Action Result Type

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
```

### 10.3 PostgreSQL Exception Mapping

| RPC exception | Mapped to |
|---------------|-----------|
| `insufficient_stock` | `InsufficientStockError` |
| `permission_denied` | `ForbiddenError` |
| `organization_mismatch` | `ForbiddenError` |
| `reason_required` | `ValidationError` |
| `invalid_line_quantity` | `ValidationError` |
| Unique violation (SKU) | `ConflictError` |

### 10.4 User-Facing Messages

- Safe, actionable text — no stack traces
- Insufficient stock: include variant SKU/name in message (from DB lookup after error)
- Log full detail server-side (see §11)

---

## 11. Logging Strategy

### 11.1 Principles

- Structured JSON logs in production (Vercel)
- Include correlation ID per request (`x-correlation-id` header or generated UUID)
- Never log secrets, tokens, or PII beyond user ID
- Log inventory failures with: operation, org, user, variant, warehouse, quantities

### 11.2 Levels

| Level | Use |
|-------|-----|
| `info` | Successful mutations (sale completed, receipt posted) |
| `warn` | Authorization failures, validation failures |
| `error` | RPC failures, unexpected exceptions |

### 11.3 Helper

```typescript
logger.info('sale.completed', { correlationId, saleId, userId, organizationId, total });
logger.error('sale.complete.failed', { correlationId, error, saleId, code });
```

Audit log (`audit_logs` table) is separate from application logging — used for compliance and admin UI.

---

## 12. Audit Behavior

### 12.1 When to Audit

| Event | `action` | Entity |
|-------|----------|--------|
| Product create/update/archive | `product.create`, `product.update`, `product.archive` | `products` |
| Price change on variant | `variant.price_change` | `product_variants` |
| User role change | `user.role_change` | `profiles` |
| User deactivate | `user.deactivate` | `profiles` |
| Sale complete / cancel | `sale.complete`, `sale.cancel` | `sales` |
| PO status change | `purchase.status_change` | `purchase_orders` |
| Settings update | `settings.update` | `organizations` |

**Inventory movements are self-auditing** via immutable ledger — no duplicate audit row required per movement unless admin-facing summary desired.

### 12.2 Audit Service

```typescript
auditService.log(user, {
  action: 'product.update',
  entityType: 'products',
  entityId: productId,
  oldValues: { ... },
  newValues: { ... },
});
```

Insert into `audit_logs` via server client (admin read RLS). Append-only at DB level.

---

## 13. Critical Operation Specifications

Each operation follows the same documentation template:

1. Input  
2. Validation  
3. Authentication  
4. Authorization  
5. Database operation  
6. Transaction requirements  
7. Error handling  
8. Audit behavior  
9. Returned result  

---

### 13.1 `createProduct`

| Aspect | Specification |
|--------|---------------|
| **Transport** | Server Action → `productService.create()` |
| **Input** | `{ name, description?, categoryId?, unitOfMeasure, baseCostPrice, baseSalePrice, variants: [{ name, sku, barcode?, costPrice?, salePrice?, reorderPoint? }] }` |
| **Validation** | `createProductSchema` — min 1 variant, SKU format, non-negative prices |
| **Authentication** | `requireUser()` |
| **Authorization** | `requirePermission('products', 'write')` — Admin only MVP |
| **Database** | Single transaction: INSERT `products` + INSERT `product_variants` (organization_id from session). Check SKU/barcode uniqueness. |
| **Transaction** | Required — product + variants atomic |
| **Errors** | `ConflictError` duplicate SKU/barcode; `ValidationError` empty variants |
| **Audit** | `product.create` with new values |
| **Returns** | `{ id, name, variants: [...] }` DTO |

**Never accepts:** `organizationId`, stock quantities.

---

### 13.2 `updateProduct`

| Aspect | Specification |
|--------|---------------|
| **Transport** | Server Action → `productService.update()` |
| **Input** | `{ productId, name?, description?, categoryId?, unitOfMeasure?, baseCostPrice?, baseSalePrice?, status?, variants?: { create[], update[], archive[] } }` |
| **Validation** | `updateProductSchema`; variant SKU uniqueness excluding self |
| **Authentication** | `requireUser()` |
| **Authorization** | `requirePermission('products', 'write')` |
| **Database** | Transaction: UPDATE `products`; upsert/archive variants. Price changes logged. |
| **Transaction** | Required |
| **Errors** | `NotFoundError` if product not in org; `ConflictError` SKU collision |
| **Audit** | `product.update`; `variant.price_change` if prices changed |
| **Returns** | Updated product DTO |

**Never accepts:** client `organizationId`. Cannot set stock.

---

### 13.3 `archiveProduct`

| Aspect | Specification |
|--------|---------------|
| **Transport** | Server Action → `productService.archive()` |
| **Input** | `{ productId }` |
| **Validation** | `z.object({ productId: z.string().uuid() })` |
| **Authentication** | `requireUser()` |
| **Authorization** | `requirePermission('products', 'write')` |
| **Database** | Soft delete: `products.status = 'archived'`, `deleted_at = now()`; variants `is_active = false` |
| **Transaction** | Single UPDATE transaction |
| **Errors** | `NotFoundError`; `ConflictError` if open draft sales reference variants (optional check) |
| **Audit** | `product.archive` |
| **Returns** | `{ id, status: 'archived' }` |

Does not delete movements or history.

---

### 13.4 `createSale`

Two phases: **draft creation** (no inventory) and **complete** (separate operation §13.5).

| Aspect | Specification |
|--------|---------------|
| **Transport** | Server Action → `saleService.createDraft()` |
| **Input** | `{ warehouseId?, customerId?, lines: [{ productVariantId, quantity }] }` — no trusted prices |
| **Validation** | `createSaleSchema`; quantity > 0; variant exists in org |
| **Authentication** | `requireUser()` |
| **Authorization** | `requirePermission('sales', 'write')` |
| **Database** | INSERT `sales` status `draft`, `sale_items` with **server-resolved** `unit_price` from variant, computed `line_total`. Document number via `next_document_number`. |
| **Transaction** | Required for sale + items + sequence |
| **Errors** | `NotFoundError` variant/customer; `ValidationError` invalid qty |
| **Audit** | Optional `sale.create` (draft) |
| **Returns** | `{ saleId, documentNumber, status: 'draft', lines, subtotal, total }` |

**Price rule:** Server reads `product_variants.sale_price ?? products.base_sale_price`. Client-displayed prices ignored.

**Warehouse:** If omitted, use org default warehouse from `warehouses WHERE is_default`.

---

### 13.5 `completeSale` (implements “finalize sale” — paired with createSale)

| Aspect | Specification |
|--------|---------------|
| **Transport** | Server Action → `saleService.complete()` → **RPC** `complete_sale` |
| **Input** | `{ saleId, idempotencyKey?, discountAmount? }` |
| **Validation** | Sale exists, status `draft`, belongs to org; discount within role limits |
| **Authentication** | `requireUser()` |
| **Authorization** | `requirePermission('sales', 'complete')` |
| **Database (RPC)** | Single PostgreSQL transaction: lock sale row; validate lines; for each line `record_inventory_movement(type=sale, qty=-n)`; UPDATE `sale_items.movement_id`; SET sale `completed`, totals, `completed_at` |
| **Transaction** | **Mandatory** — entire RPC body |
| **Concurrency** | Row locks on balances per line; second concurrent sale gets `insufficient_stock` |
| **Errors** | `InsufficientStockError`; `ConflictError` if not draft; idempotent retry returns same result |
| **Audit** | `sale.complete` |
| **Returns** | `{ saleId, documentNumber, status: 'completed', total, completedAt }` |

**Planned RPC:** migration `00014_complete_sale.sql` (not yet deployed).

---

### 13.6 `cancelSale`

| Aspect | Specification |
|--------|---------------|
| **Transport** | Server Action → `saleService.cancel()` |
| **Input** | `{ saleId }` |
| **Validation** | Sale status must be `draft` only (completed sales use returns) |
| **Authentication** | `requireUser()` |
| **Authorization** | `requirePermission('sales', 'write')` or admin |
| **Database** | UPDATE `sales.status = 'cancelled'` — **no inventory impact** |
| **Transaction** | Single UPDATE |
| **Errors** | `ConflictError` if already completed |
| **Audit** | `sale.cancel` |
| **Returns** | `{ saleId, status: 'cancelled' }` |

---

### 13.7 `createPurchase`

| Aspect | Specification |
|--------|---------------|
| **Transport** | Server Action → `purchaseService.create()` |
| **Input** | `{ supplierId, warehouseId?, lines: [{ productVariantId, quantityOrdered, unitCost }] }` |
| **Validation** | `createPurchaseSchema`; admin enters unit cost — validated non-negative, variant in org |
| **Authentication** | `requireUser()` |
| **Authorization** | `requirePermission('purchases', 'write')` |
| **Database** | INSERT `purchase_orders` status `draft` + `purchase_order_items`; compute totals; document number |
| **Transaction** | Required |
| **Errors** | `NotFoundError` supplier/variant |
| **Audit** | `purchase.create` |
| **Returns** | PO DTO with `id`, `documentNumber`, `status`, lines |

**Note:** Unit cost on PO is trusted from admin input (not employee). Server validates numeric bounds and stores snapshot on receipt.

---

### 13.8 `receivePurchase`

| Aspect | Specification |
|--------|---------------|
| **Transport** | Server Action → `purchaseService.receive()` → **RPC** `receive_purchase` |
| **Input** | `{ purchaseOrderId, lines: [{ purchaseOrderItemId, quantityReceived, unitCost? }], notes?, idempotencyKey? }` |
| **Validation** | PO status `ordered` or `partially_received`; qty ≤ remaining ordered; unit cost override admin-only |
| **Authentication** | `requireUser()` |
| **Authorization** | `requirePermission('purchases', 'receive')` |
| **Database (RPC)** | Transaction: INSERT `purchase_receipts` + items; per line `record_inventory_movement(type=purchase_receipt, qty=+n, unit_cost)`; UPDATE `purchase_order_items.quantity_received`; UPDATE PO status |
| **Transaction** | **Mandatory** |
| **Errors** | `ValidationError` over-receive; `ConflictError` cancelled PO |
| **Audit** | `purchase.receive` |
| **Returns** | `{ receiptId, documentNumber, purchaseOrderStatus, linesReceived }` |

**Planned RPC:** migration `00015_receive_purchase.sql`.

---

### 13.9 `createStockAdjustment`

| Aspect | Specification |
|--------|---------------|
| **Transport** | Server Action → `adjustmentService.create()` → **RPC** `create_stock_adjustment` (**deployed**) |
| **Input** | `{ warehouseId, adjustmentType, reason, notes?, lines: [{ productVariantId, quantity }], idempotencyKey? }` |
| **Validation** | `createStockAdjustmentSchema`; reason min length; qty > 0 |
| **Authentication** | `requireUser()` |
| **Authorization** | `requirePermission('inventory', 'adjust')` + RPC `has_permission` |
| **Database** | RPC creates adjustment header, items, movements via `record_inventory_movement` |
| **Transaction** | **Mandatory** (RPC) |
| **Errors** | `InsufficientStockError` on decrease/damage/loss; `ValidationError` missing reason |
| **Audit** | `inventory.adjustment` referencing adjustment ID |
| **Returns** | `{ adjustmentId, documentNumber, adjustmentType }` |

**Service must pass** `organizationId` and `createdBy` from session — RPC validates with `assert_same_organization`.

---

### 13.10 `processReturn`

| Aspect | Specification |
|--------|---------------|
| **Transport** | Server Action → `returnService.process()` → **RPC** `process_return` |
| **Input** | `{ saleId, lines: [{ saleItemId, quantity, isRestockable }], notes?, idempotencyKey? }` |
| **Validation** | Sale `completed` or partially returned; qty ≤ returnable per line |
| **Authentication** | `requireUser()` |
| **Authorization** | `requirePermission('returns', 'write')` |
| **Database (RPC)** | Transaction: INSERT `returns` + `return_items`; restockable → movement `sale_return` (+qty); damaged → `damage` (no sellable increase); UPDATE `sale_items.quantity_returned`; UPDATE sale status |
| **Transaction** | **Mandatory** |
| **Errors** | `ValidationError` excess return qty |
| **Audit** | `return.process` |
| **Returns** | `{ returnId, documentNumber, saleStatus }` |

**Planned RPC:** migration `00016_process_return.sql`.

---

### 13.11 `transferStock`

| Aspect | Specification |
|--------|---------------|
| **Transport** | Server Action → `inventoryService.transfer()` → **RPC** `transfer_stock` |
| **Input** | `{ sourceWarehouseId, destinationWarehouseId, lines: [{ productVariantId, quantity }], reason, notes?, idempotencyKey? }` |
| **Validation** | Distinct warehouses, same org; qty > 0 |
| **Authentication** | `requireUser()` |
| **Authorization** | `requirePermission('inventory', 'adjust')` (or future `inventory.transfer`) |
| **Database (RPC)** | Transaction: per line paired `transfer_out` (-qty) and `transfer_in` (+qty); locks source balance first |
| **Transaction** | **Mandatory** |
| **Errors** | `InsufficientStockError` on source |
| **Audit** | `inventory.transfer` |
| **Returns** | `{ transferReference, linesTransferred }` |

**Planned RPC:** migration `00017_transfer_stock.sql`. May use synthetic adjustment document or dedicated transfer header table in future — movements are authoritative.

---

### 13.12 `getDashboardData`

| Aspect | Specification |
|--------|---------------|
| **Transport** | Server Component data fetch → `dashboardService.getSummary()` |
| **Input** | `{ dateRange?: { from, to } }` — org from session only |
| **Validation** | Optional date range schema |
| **Authentication** | `requireUser()` |
| **Authorization** | Any active org member |
| **Database** | Parallel read queries: aggregates on `sales` (today/month), sum `inventory_balances × cost`, count from `v_low_stock_items`, recent sales/movements limited 5–10 rows |
| **Transaction** | Read-only — no transaction required |
| **Errors** | `UnauthorizedError` only |
| **Audit** | None |
| **Returns** | `DashboardSummaryDTO` matching UI mock shape |

**Implementation note:** Replace mock data in dashboard page incrementally; Server Component calls service directly.

---

## 14. Additional Read Operations

| Operation | Transport | Auth | DB |
|-----------|-----------|------|-----|
| List products | Server Component | read products | SELECT + pagination |
| Get product detail | Server Component | read products | SELECT + variants |
| List inventory | Server Component | read inventory | `v_inventory_status` |
| Movement history | Server Component | read inventory | SELECT movements filtered |
| List sales | Server Component | read sales | SELECT sales |
| Sale detail | Server Component | read sales | SELECT sale + items |
| Reports export | Route Handler GET | read reports + API key optional | Query + CSV stream |
| Low stock API (n8n) | Route Handler GET | API key | `v_low_stock_items` |

---

## 15. Planned PostgreSQL RPC Migrations

These extend deployed `00010_inventory_functions.sql` without schema redesign:

| Migration | Function | Purpose |
|-----------|----------|---------|
| `00014_complete_sale.sql` | `complete_sale(p_sale_id, p_completed_by, p_idempotency_key?)` | Atomic sale completion |
| `00015_receive_purchase.sql` | `receive_purchase(p_po_id, p_lines jsonb, p_created_by, ...)` | Receipt + inventory |
| `00016_process_return.sql` | `process_return(p_sale_id, p_lines jsonb, p_created_by, ...)` | Returns + inventory |
| `00017_transfer_stock.sql` | `transfer_stock(p_org_id, p_source, p_dest, p_lines, ...)` | Warehouse transfer |
| `00018_audit_log_rpc.sql` | `insert_audit_log(...)` | Optional SECURITY DEFINER audit insert |

Each RPC must:

- Call `assert_same_organization()`
- Call `has_permission()` for relevant action
- Use `record_inventory_movement()` for stock changes
- Use `p_created_by = auth.uid()` validated against session inside RPC

---

## 16. Route Handler Specifications (API v1)

**Base path:** `/api/v1/`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/health` | GET | None | DB connectivity |
| `/api/v1/inventory/low-stock` | GET | API key | n8n low-stock read |
| `/api/v1/reports/daily-sales` | GET | API key | n8n sales summary |
| `/api/v1/exports/movements` | GET | Session or API key | CSV export |

**API key validation:** `api_keys` table (future migration) — hash compare, scope check, rate limit.

**Never expose** write endpoints that bypass RPC for inventory.

---

## 17. Request Lifecycle Example: Complete Sale

```
1. User clicks "Complete sale" in POS
2. Client calls completeSaleAction({ saleId, idempotencyKey })
3. Server Action:
   a. requirePermission('sales', 'complete')
   b. completeSaleSchema.parse(input)
   c. saleService.complete(user, parsed)
4. saleService:
   a. Verify sale belongs to user.organizationId (SELECT)
   b. supabase.rpc('complete_sale', {
        p_sale_id: saleId,
        p_completed_by: user.id,        // from session
        p_idempotency_key: key
      })
5. PostgreSQL complete_sale:
   a. assert_same_organization(sale.organization_id)
   b. has_permission('sales', 'complete')
   c. FOR UPDATE sale row
   d. For each line: record_inventory_movement (locks balance)
   e. Update sale status, movement_ids
6. Service logs audit, returns DTO
7. Server Action revalidatePath('/sales'), returns ActionResult
8. UI shows receipt or InsufficientStockError per line
```

Concurrent sale on last unit at step 5d: second transaction blocks on `FOR UPDATE`, then fails with `insufficient_stock`.

---

## 18. Testing Strategy (Backend)

| Layer | Focus |
|-------|-------|
| Zod schemas | Invalid inputs rejected |
| Services | Mock Supabase client; verify RPC called with session-derived IDs |
| RPC integration | Two concurrent `complete_sale` against qty=1 — one succeeds |
| RLS | Employee cannot INSERT product |
| Permissions | Employee blocked from `create_stock_adjustment` |

See `/docs/testing.md` (to be populated).

---

## 19. Environment Variables

| Variable | Used by | Exposed |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | All clients | Browser OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server user client | Browser OK |
| `SUPABASE_SERVICE_ROLE_KEY` | `admin.ts` only | **Server only** |

Never prefix service role with `NEXT_PUBLIC_`.

---

## 20. Implementation Order (Aligns with Roadmap)

1. Supabase clients + middleware + session helpers  
2. Auth Server Actions (login/logout/profile)  
3. Catalog services (create/update/archive product)  
4. Read services (lists, dashboard replacing mock)  
5. Deploy RPC migrations 00014–00017  
6. Sales / purchasing / returns Server Actions  
7. Route Handlers for exports and n8n  
8. Audit service integration  

---

## 21. Related Documents

- `/docs/architecture.md` — system architecture
- `/docs/database.md` — schema, RLS, deployed RPCs
- `/docs/requirements.md` — business and inventory rules
- `/docs/roadmap.md` — phased delivery
- `/docs/security.md` — threat model (to be populated)
- `/docs/automations.md` — n8n contracts (to be populated)

This document is the **source of truth for backend implementation**. Application code must follow these patterns unless a documented security or integrity issue requires change.
