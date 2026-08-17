# Inventario Pro — Database Design

## 1. Overview

Inventario Pro uses **Supabase PostgreSQL** as the system of record. The schema is designed for:

- Full **inventory traceability** via an immutable movement ledger
- **Concurrency-safe** stock mutations (no negative inventory under race conditions)
- **Organization-scoped multi-tenancy** from day one
- **Future multi-warehouse and multi-branch** support without breaking changes
- **Row Level Security (RLS)** aligned with Admin / Employee roles
- **Granular permissions** architecture (seeded for MVP roles)

### 1.1 Critical Design Rule

**Never model inventory as `products.stock`.**

On-hand quantity lives in `inventory_balances` (one row per `warehouse_id` + `product_variant_id`). Every quantity change creates an `inventory_movements` row in the **same transaction** that updates the balance.

```
Business document (sale, receipt, adjustment, return)
        │
        ▼
PostgreSQL RPC (transaction)
        │
        ├── SELECT … FOR UPDATE on inventory_balances
        ├── INSERT inventory_movements (before/after qty, type, refs, user)
        └── UPDATE inventory_balances
```

---

## 2. Entity Relationship Summary

```
organizations
  ├── branches (future branch scoping)
  ├── profiles ──► auth.users
  ├── permissions ◄── role_permissions (app_role)
  ├── categories (self-referential)
  ├── products ──► categories
  │     └── product_variants (SKU, barcode, reorder_point)
  ├── warehouses ──► branches (optional)
  ├── suppliers
  ├── customers
  ├── inventory_balances (warehouse + variant → qty)
  ├── inventory_movements (immutable ledger)
  ├── stock_adjustments ──► stock_adjustment_items ──► movements
  ├── purchase_orders ──► purchase_order_items
  │     └── purchase_receipts ──► purchase_receipt_items ──► movements
  ├── sales ──► sale_items ──► movements
  ├── returns ──► return_items ──► movements
  ├── document_sequences
  └── audit_logs
```

---

## 3. Enumerations

| Enum | Values | Purpose |
|------|--------|---------|
| `app_role` | `admin`, `employee` | MVP user roles on `profiles` |
| `product_status` | `active`, `archived` | Product lifecycle |
| `movement_type` | `initial_stock`, `purchase_receipt`, `sale`, `sale_return`, `adjustment_increase`, `adjustment_decrease`, `damage`, `loss`, `transfer_in`, `transfer_out` | Ledger classification |
| `purchase_order_status` | `draft`, `ordered`, `partially_received`, `received`, `cancelled` | PO workflow |
| `sale_status` | `draft`, `completed`, `cancelled`, `partially_returned`, `fully_returned` | Sale workflow |
| `stock_adjustment_type` | `initial_stock`, `increase`, `decrease`, `damage`, `loss` | Adjustment header type |
| `document_kind` | `sale`, `purchase_order`, `purchase_receipt`, `return`, `stock_adjustment` | Sequential numbering |

---

## 4. Tables

### 4.1 Tenant & Access

#### `organizations`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Tenant root |
| `name` | `text` | NOT NULL | Display name |
| `slug` | `text` | NOT NULL, UNIQUE | URL-safe identifier |
| `timezone` | `text` | NOT NULL, default `'UTC'` | Display timezone |
| `currency_code` | `char(3)` | NOT NULL, default `'USD'` | ISO 4217 |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

**Delete behavior:** RESTRICT — organizations are never deleted in production.

#### `branches`

Future-ready branch entity. MVP may use zero or one default branch.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | NOT NULL, FK → `organizations` ON DELETE RESTRICT |
| `name` | `text` | NOT NULL |
| `code` | `text` | NOT NULL |
| `is_active` | `boolean` | NOT NULL, default `true` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

**Unique:** `(organization_id, code)`

#### `profiles`

Extends Supabase `auth.users`.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, FK → `auth.users` ON DELETE CASCADE |
| `organization_id` | `uuid` | NOT NULL, FK → `organizations` ON DELETE RESTRICT |
| `branch_id` | `uuid` | NULL, FK → `branches` ON DELETE SET NULL |
| `full_name` | `text` | NOT NULL |
| `role` | `app_role` | NOT NULL, default `'employee'` |
| `is_active` | `boolean` | NOT NULL, default `true` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

**Index:** `(organization_id)`, `(organization_id, role)`

#### `permissions`

Global permission catalog (not org-scoped).

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `resource` | `text` | NOT NULL |
| `action` | `text` | NOT NULL |

**Unique:** `(resource, action)`

Examples: `('products', 'read')`, `('inventory', 'adjust')`, `('sales', 'complete')`.

#### `role_permissions`

Maps MVP roles to permissions.

| Column | Type | Constraints |
|--------|------|-------------|
| `role` | `app_role` | NOT NULL |
| `permission_id` | `uuid` | NOT NULL, FK → `permissions` ON DELETE CASCADE |

**Primary key:** `(role, permission_id)`

---

### 4.2 Catalog

#### `categories`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | NOT NULL, FK → `organizations` |
| `parent_id` | `uuid` | NULL, FK → `categories` ON DELETE RESTRICT |
| `name` | `text` | NOT NULL |
| `slug` | `text` | NOT NULL |
| `sort_order` | `integer` | NOT NULL, default `0` |
| `is_active` | `boolean` | NOT NULL, default `true` |
| `deleted_at` | `timestamptz` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

**Unique (partial):** `(organization_id, slug)` WHERE `deleted_at IS NULL`

#### `products`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | NOT NULL, FK → `organizations` |
| `category_id` | `uuid` | NULL, FK → `categories` ON DELETE SET NULL |
| `name` | `text` | NOT NULL |
| `description` | `text` | NULL |
| `unit_of_measure` | `text` | NOT NULL, default `'unit'` |
| `base_cost_price` | `numeric(12,2)` | NOT NULL, default `0`, CHECK `>= 0` |
| `base_sale_price` | `numeric(12,2)` | NOT NULL, default `0`, CHECK `>= 0` |
| `status` | `product_status` | NOT NULL, default `'active'` |
| `deleted_at` | `timestamptz` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

**Index:** `(organization_id, status)`, `(organization_id, name)`

#### `product_variants`

Sellable SKU-level entity. **No `stock` column.**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | NOT NULL, FK → `organizations` |
| `product_id` | `uuid` | NOT NULL, FK → `products` ON DELETE RESTRICT |
| `name` | `text` | NOT NULL |
| `sku` | `text` | NOT NULL |
| `barcode` | `text` | NULL |
| `cost_price` | `numeric(12,2)` | NULL, CHECK `>= 0` |
| `sale_price` | `numeric(12,2)` | NULL, CHECK `>= 0` |
| `reorder_point` | `integer` | NOT NULL, default `0`, CHECK `>= 0` |
| `is_active` | `boolean` | NOT NULL, default `true` |
| `deleted_at` | `timestamptz` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

**Unique:** `(organization_id, sku)`

**Unique (partial):** `(organization_id, barcode)` WHERE `barcode IS NOT NULL AND deleted_at IS NULL`

**Index:** `(product_id)`, `(organization_id, sku)`, GIN/trigram on name (future)

#### `variant_reorder_points` (optional per-warehouse thresholds)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | NOT NULL, FK → `organizations` |
| `warehouse_id` | `uuid` | NOT NULL, FK → `warehouses` |
| `product_variant_id` | `uuid` | NOT NULL, FK → `product_variants` |
| `reorder_point` | `integer` | NOT NULL, CHECK `>= 0` |

**Unique:** `(warehouse_id, product_variant_id)`

MVP can rely on `product_variants.reorder_point` only; this table enables warehouse-specific thresholds without schema change later.

---

### 4.3 Parties & Warehouses

#### `suppliers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | FK |
| `name` | `text` | NOT NULL |
| `contact_name` | `text` | NULL |
| `email` | `text` | NULL |
| `phone` | `text` | NULL |
| `tax_id` | `text` | NULL |
| `payment_terms` | `text` | NULL |
| `notes` | `text` | NULL |
| `is_active` | `boolean` | default `true` |
| `deleted_at` | `timestamptz` | soft delete |
| `created_at`, `updated_at` | `timestamptz` | |

#### `customers`

Same pattern as suppliers (without payment_terms).

#### `warehouses`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | FK |
| `branch_id` | `uuid` | NULL, FK → `branches` — future branch scoping |
| `name` | `text` | NOT NULL |
| `code` | `text` | NOT NULL |
| `address` | `text` | NULL |
| `is_default` | `boolean` | NOT NULL, default `false` |
| `is_active` | `boolean` | NOT NULL, default `true` |
| `created_at`, `updated_at` | `timestamptz` | |

**Unique:** `(organization_id, code)`

**Partial unique:** one default warehouse per org — enforced via unique index on `(organization_id)` WHERE `is_default = true`.

---

### 4.4 Inventory Core

#### `inventory_balances` (cached current stock)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | NOT NULL, FK → `organizations` |
| `warehouse_id` | `uuid` | NOT NULL, FK → `warehouses` |
| `product_variant_id` | `uuid` | NOT NULL, FK → `product_variants` |
| `quantity_on_hand` | `integer` | NOT NULL, default `0`, CHECK `>= 0` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

**Unique:** `(warehouse_id, product_variant_id)`

**Index:** `(organization_id, warehouse_id)`, `(product_variant_id)`, `(warehouse_id, quantity_on_hand)` for low-stock joins

**Strategy:** Authoritative for reads; updated **only** inside inventory RPCs. Never user-editable.

#### `inventory_movements` (immutable ledger)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | NOT NULL, FK → `organizations` |
| `warehouse_id` | `uuid` | NOT NULL, FK → `warehouses` |
| `product_variant_id` | `uuid` | NOT NULL, FK → `product_variants` |
| `movement_type` | `movement_type` | NOT NULL |
| `quantity` | `integer` | NOT NULL, CHECK `quantity <> 0` (signed) |
| `quantity_before` | `integer` | NOT NULL, CHECK `>= 0` |
| `quantity_after` | `integer` | NOT NULL, CHECK `>= 0` |
| `unit_cost` | `numeric(12,4)` | NULL, CHECK `>= 0` |
| `reason` | `text` | NULL — required for adjustments/damage/loss (enforced in RPC) |
| `notes` | `text` | NULL |
| `sale_id` | `uuid` | NULL, FK → `sales` |
| `sale_item_id` | `uuid` | NULL, FK → `sale_items` |
| `purchase_receipt_id` | `uuid` | NULL, FK → `purchase_receipts` |
| `purchase_receipt_item_id` | `uuid` | NULL, FK → `purchase_receipt_items` |
| `stock_adjustment_id` | `uuid` | NULL, FK → `stock_adjustments` |
| `return_id` | `uuid` | NULL, FK → `returns` |
| `return_item_id` | `uuid` | NULL, FK → `return_items` |
| `idempotency_key` | `text` | NULL |
| `created_by` | `uuid` | NOT NULL, FK → `profiles` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

**Unique (partial):** `(organization_id, idempotency_key)` WHERE `idempotency_key IS NOT NULL`

**Indexes:**

- `(organization_id, created_at DESC)`
- `(warehouse_id, product_variant_id, created_at DESC)`
- `(movement_type, created_at DESC)`
- `(sale_id)`, `(purchase_receipt_id)`, `(stock_adjustment_id)`, `(return_id)`

**Immutability:** trigger `trg_inventory_movements_immutable` blocks UPDATE and DELETE.

**Attribution:** every movement records variant, warehouse, signed quantity, type, before/after balances, optional document FKs, user, reason/notes, timestamp.

#### `stock_adjustments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | FK |
| `warehouse_id` | `uuid` | FK |
| `document_number` | `text` | NOT NULL |
| `adjustment_type` | `stock_adjustment_type` | NOT NULL |
| `reason` | `text` | NOT NULL |
| `notes` | `text` | NULL |
| `created_by` | `uuid` | FK → `profiles` |
| `created_at` | `timestamptz` | NOT NULL |

**Unique:** `(organization_id, document_number)`

#### `stock_adjustment_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `stock_adjustment_id` | `uuid` | FK |
| `product_variant_id` | `uuid` | FK |
| `quantity` | `integer` | NOT NULL, CHECK `> 0` |
| `movement_id` | `uuid` | NOT NULL, UNIQUE, FK → `inventory_movements` |

Direction (in/out) derived from header `adjustment_type` when creating movements.

---

### 4.5 Purchasing

#### `purchase_orders`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | FK |
| `supplier_id` | `uuid` | FK → `suppliers` |
| `warehouse_id` | `uuid` | FK → `warehouses` (destination) |
| `document_number` | `text` | NOT NULL |
| `status` | `purchase_order_status` | NOT NULL, default `'draft'` |
| `ordered_at` | `timestamptz` | NULL |
| `notes` | `text` | NULL |
| `subtotal` | `numeric(12,2)` | NOT NULL, default `0` |
| `total` | `numeric(12,2)` | NOT NULL, default `0` |
| `created_by` | `uuid` | FK → `profiles` |
| `created_at`, `updated_at` | `timestamptz` | |

**Unique:** `(organization_id, document_number)`

#### `purchase_order_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `purchase_order_id` | `uuid` | FK ON DELETE RESTRICT |
| `product_variant_id` | `uuid` | FK |
| `quantity_ordered` | `integer` | NOT NULL, CHECK `> 0` |
| `quantity_received` | `integer` | NOT NULL, default `0`, CHECK `>= 0` |
| `unit_cost` | `numeric(12,2)` | NOT NULL, CHECK `>= 0` |
| `line_total` | `numeric(12,2)` | NOT NULL, CHECK `>= 0` |

**Check:** `quantity_received <= quantity_ordered` (admin override is an application concern with elevated permission).

#### `purchase_receipts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | FK |
| `purchase_order_id` | `uuid` | FK |
| `warehouse_id` | `uuid` | FK |
| `document_number` | `text` | NOT NULL |
| `received_at` | `timestamptz` | NOT NULL, default `now()` |
| `notes` | `text` | NULL |
| `created_by` | `uuid` | FK → `profiles` |
| `created_at` | `timestamptz` | NOT NULL |

#### `purchase_receipt_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `purchase_receipt_id` | `uuid` | FK |
| `purchase_order_item_id` | `uuid` | FK |
| `product_variant_id` | `uuid` | FK |
| `quantity_received` | `integer` | NOT NULL, CHECK `> 0` |
| `unit_cost` | `numeric(12,2)` | NOT NULL, CHECK `>= 0` |
| `movement_id` | `uuid` | NOT NULL, UNIQUE, FK → `inventory_movements` |

---

### 4.6 Sales & Returns

#### `sales`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | FK |
| `warehouse_id` | `uuid` | FK |
| `customer_id` | `uuid` | NULL, FK → `customers` |
| `document_number` | `text` | NOT NULL |
| `status` | `sale_status` | NOT NULL, default `'draft'` |
| `subtotal` | `numeric(12,2)` | NOT NULL, default `0` |
| `discount_amount` | `numeric(12,2)` | NOT NULL, default `0`, CHECK `>= 0` |
| `total` | `numeric(12,2)` | NOT NULL, default `0`, CHECK `>= 0` |
| `completed_at` | `timestamptz` | NULL |
| `created_by` | `uuid` | FK → `profiles` |
| `created_at`, `updated_at` | `timestamptz` | |

#### `sale_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `sale_id` | `uuid` | FK ON DELETE RESTRICT |
| `product_variant_id` | `uuid` | FK |
| `quantity` | `integer` | NOT NULL, CHECK `> 0` |
| `quantity_returned` | `integer` | NOT NULL, default `0`, CHECK `>= 0` |
| `unit_price` | `numeric(12,2)` | NOT NULL, CHECK `>= 0` (snapshot) |
| `discount_amount` | `numeric(12,2)` | NOT NULL, default `0` |
| `line_total` | `numeric(12,2)` | NOT NULL, CHECK `>= 0` |
| `movement_id` | `uuid` | NULL, UNIQUE, FK → `inventory_movements` (set on complete) |

**Check:** `quantity_returned <= quantity`

#### `returns`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | FK |
| `sale_id` | `uuid` | FK → `sales` |
| `warehouse_id` | `uuid` | FK |
| `document_number` | `text` | NOT NULL |
| `notes` | `text` | NULL |
| `created_by` | `uuid` | FK → `profiles` |
| `created_at` | `timestamptz` | NOT NULL |

#### `return_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `return_id` | `uuid` | FK |
| `sale_item_id` | `uuid` | FK → `sale_items` |
| `product_variant_id` | `uuid` | FK |
| `quantity` | `integer` | NOT NULL, CHECK `> 0` |
| `is_restockable` | `boolean` | NOT NULL, default `true` |
| `restock_movement_id` | `uuid` | NULL, UNIQUE, FK → `inventory_movements` |
| `damage_movement_id` | `uuid` | NULL, UNIQUE, FK → `inventory_movements` |

Non-restockable returns create a `damage` movement (no sellable stock increase).

---

### 4.7 Operations

#### `document_sequences`

| Column | Type | Notes |
|--------|------|-------|
| `organization_id` | `uuid` | FK, part of PK |
| `document_kind` | `document_kind` | part of PK |
| `last_value` | `bigint` | NOT NULL, default `0` |

**Primary key:** `(organization_id, document_kind)`

Used with `next_document_number()` for atomic sequential document numbers.

#### `audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | FK |
| `user_id` | `uuid` | NULL, FK → `profiles` |
| `action` | `text` | NOT NULL |
| `entity_type` | `text` | NOT NULL |
| `entity_id` | `uuid` | NOT NULL |
| `old_values` | `jsonb` | NULL |
| `new_values` | `jsonb` | NULL |
| `ip_address` | `inet` | NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

**Immutability:** trigger blocks UPDATE/DELETE.

---

## 5. Soft Delete Strategy

| Entity | Strategy |
|--------|----------|
| Products, variants, categories | `deleted_at` timestamp + `is_active` / `status` |
| Suppliers, customers | `deleted_at` + `is_active` |
| Sales, POs, movements, audit | **Never soft-deleted** — use status or reversal |
| Profiles | `is_active = false` (no hard delete if audit trail exists) |

Historical documents retain FK integrity via RESTRICT and soft-delete on catalog only.

---

## 6. Delete Behavior Summary

| Relationship | ON DELETE |
|--------------|-----------|
| `profiles.id` → `auth.users` | CASCADE |
| All business FKs → `organizations` | RESTRICT |
| `products` → `categories` | SET NULL |
| `sale_items` → `sales` | RESTRICT |
| `inventory_movements` → documents | RESTRICT |
| `parent_id` → `categories` | RESTRICT |

---

## 7. Inventory Ledger Strategy

### 7.1 Movement Rules

1. Every stock change inserts exactly one movement row per variant/warehouse affected.
2. `quantity` is signed: positive = inbound, negative = outbound.
3. `quantity_before` and `quantity_after` are snapshots at mutation time.
4. `quantity_after = quantity_before + quantity` (enforced in RPC).
5. Movements are insert-only (trigger-enforced).
6. Corrections use compensating movements, never edits.

### 7.2 Cached Balance Strategy

`inventory_balances` exists for **read performance** and **row-level locking**.

- Created lazily on first movement for a (warehouse, variant) pair.
- Updated in same transaction as movement insert.
- CHECK constraint `quantity_on_hand >= 0` is the last line of defense.
- Reconciliation view `v_inventory_reconciliation` compares balance vs sum(movements) for audits.

### 7.3 Low-Stock Detection

Primary: join `inventory_balances` with `product_variants.reorder_point`:

```sql
WHERE b.quantity_on_hand <= v.reorder_point
```

Future: COALESCE warehouse-specific `variant_reorder_points.reorder_point`, variant default.

View `v_low_stock_items` provided in migrations.

---

## 8. Transaction Boundaries

| Operation | Tables in one transaction |
|-----------|----------------------------|
| Record movement | `inventory_balances` (lock), `inventory_movements`, optional line FK update |
| Complete sale | `sales`, `sale_items`, movements per line, balance updates |
| Receive purchase | `purchase_receipts`, `purchase_receipt_items`, `purchase_order_items.quantity_received`, PO status, movements |
| Stock adjustment | `stock_adjustments`, `stock_adjustment_items`, movements |
| Process return | `returns`, `return_items`, `sale_items.quantity_returned`, sale status, movements |

All use `record_inventory_movement()` internally.

---

## 9. PostgreSQL Functions / RPCs

| Function | Purpose |
|----------|---------|
| `get_user_organization_id()` | RLS helper — current user's org |
| `get_user_role()` | Returns `app_role` |
| `is_admin()` | Boolean admin check |
| `is_active_user()` | Profile exists and active |
| `has_permission(resource, action)` | Checks `role_permissions` |
| `next_document_number(org, kind)` | Atomic sequence increment |
| `record_inventory_movement(...)` | **Core primitive** — lock, validate, insert movement, update balance |
| `create_stock_adjustment(...)` | Header + lines + movements |
| `complete_sale(sale_id)` | Validate stock, complete sale, deduct inventory |
| `receive_purchase(...)` | Receipt + movements + PO updates |
| `process_return(...)` | Return lines + restock/damage movements |

All mutation RPCs:

- `SECURITY DEFINER`
- `SET search_path = public`
- Validate caller org + permissions
- Run in implicit transaction (function body)

---

## 10. Concurrency Protection

### 10.1 Mechanism

```sql
SELECT quantity_on_hand
INTO v_before
FROM inventory_balances
WHERE warehouse_id = p_warehouse_id
  AND product_variant_id = p_product_variant_id
FOR UPDATE;
```

If no row exists, insert `(0)` with `ON CONFLICT DO NOTHING`, then `FOR UPDATE` again.

### 10.2 Guarantees

- Two concurrent sales for the last unit: one succeeds, one raises `insufficient_stock`.
- Balance CHECK constraint prevents negative even if application bug bypasses validation.
- Idempotency key on movements prevents duplicate API/automation processing.

### 10.3 Isolation Level

Default PostgreSQL **READ COMMITTED** with explicit row locks is sufficient. Serializable is not required for MVP.

---

## 11. Row Level Security Strategy

### 11.1 Principles

- RLS enabled on **all** business tables.
- Authenticated users access only their `organization_id`.
- `profiles` must be readable by owner for auth bootstrap.
- **Direct INSERT/UPDATE/DELETE on `inventory_movements` denied** for `authenticated` — mutations go through RPCs (`SECURITY DEFINER`).
- **Direct UPDATE on `inventory_balances` denied** for `authenticated`.

### 11.2 MVP Policy Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| Org-scoped catalog | active users in org | admin | admin | admin (soft) |
| `inventory_balances` | org members | — (RPC only) | — (RPC only) | denied |
| `inventory_movements` | org members | — (RPC only) | denied | denied |
| `sales` | org members | admin + employee | draft: creator; admin | denied |
| `audit_logs` | admin | via RPC/trigger | denied | denied |

Employees create sales; admins manage catalog and adjustments (enforced via `has_permission` in RPCs and RLS on catalog writes).

---

## 12. Admin / Employee Permission Model

Seeded permissions (see migration `00007_seed_permissions.sql`):

**Admin:** all permissions.

**Employee:** read catalog, read inventory, create/complete sales, read/create customers, read suppliers/POs, read reports — **no** user management, **no** catalog write, **no** inventory adjust (configurable later).

Application checks `has_permission()` inside RPCs. RLS provides defense-in-depth on reads and simple writes.

---

## 13. Future Warehouse / Branch Scalability

| Feature | Schema support |
|---------|----------------|
| Multiple warehouses | `warehouse_id` on balances, movements, sales, POs |
| Warehouse transfers | `transfer_in` / `transfer_out` movement types (RPC future) |
| Branches | `branches` table; `warehouses.branch_id`; `profiles.branch_id` for scoped access |
| Multi-org SaaS | `organization_id` on all tenant tables + RLS |
| Per-warehouse reorder | `variant_reorder_points` table |
| E-commerce idempotency | `inventory_movements.idempotency_key` |

No breaking migration required for MVP → multi-warehouse.

---

## 14. Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Balance lookup | Unique index `(warehouse_id, product_variant_id)` |
| Movement history | Index `(warehouse_id, product_variant_id, created_at DESC)` |
| Dashboard aggregates | SQL views; materialized views later |
| SKU search | B-tree on `(organization_id, sku)`; pg_trgm optional later |
| Sequential docs | `document_sequences` row lock — low contention per org/kind |
| Large movement table | Monthly partitioning (future); index-only scans on recent data |
| RLS overhead | STABLE helper functions; index `organization_id` on all tenant tables |

---

## 15. Views

| View | Purpose |
|------|---------|
| `v_inventory_status` | Variant + warehouse + qty + reorder + stock status |
| `v_low_stock_items` | Items at or below reorder point |
| `v_inventory_reconciliation` | Balance vs summed movements (audit) |

---

## 16. Migration Files

Located in `/supabase/migrations/`:

| File | Contents |
|------|----------|
| `00001_extensions_and_enums.sql` | Extensions, enum types |
| `00002_tenant_and_access.sql` | organizations, branches, profiles, permissions |
| `00003_catalog.sql` | categories, products, product_variants |
| `00004_parties_and_warehouses.sql` | suppliers, customers, warehouses, variant_reorder_points |
| `00005_inventory_core.sql` | balances, movements, adjustments, immutability triggers |
| `00006_purchasing.sql` | POs, receipts |
| `00007_sales_and_returns.sql` | sales, returns |
| `00008_operations.sql` | document_sequences, audit_logs |
| `00009_auth_helpers.sql` | RLS helper functions |
| `00010_inventory_functions.sql` | `record_inventory_movement` and related RPCs |
| `00011_views.sql` | Reporting views |
| `00012_rls_policies.sql` | Enable RLS + policies |
| `00013_seed_permissions.sql` | Permission catalog + role mappings |

Apply in numeric order via Supabase CLI: `supabase db push` or `supabase migration up`.

---

## 17. Related Documents

- `/docs/architecture.md` — application use of RPCs and RLS
- `/docs/requirements.md` — inventory rules (IR-01–IR-12)
- `/docs/roadmap.md` — Phase 4 inventory core implementation
- `/docs/backend.md` — API contracts (to be populated)
