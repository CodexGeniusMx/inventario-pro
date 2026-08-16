# Inventario Pro — Requirements

## 1. Overview

Inventario Pro is a professional inventory management system for real businesses. It supports product catalog management, warehouse inventory, purchasing, sales, returns, user management, reporting, and automation integrations.

The system is designed for small and medium businesses today, with a path toward multi-warehouse, multi-branch, e-commerce, and mobile operations without compromising data integrity at any stage.

### 1.1 Goals

- Maintain accurate, traceable inventory at all times.
- Support daily operational workflows: receiving stock, selling, adjusting, and reporting.
- Enforce role-based access so employees can work efficiently while admins retain control.
- Provide auditability for inventory, pricing, and sensitive actions.
- Integrate with automation tools (n8n, WhatsApp Business) without making them the source of truth.

### 1.2 Out of Scope for MVP

- Multi-branch operations (designed for, not implemented in MVP).
- E-commerce storefront integration.
- Native mobile applications.
- Advanced granular permission matrices (architecture supports them; MVP uses Admin and Employee roles).

---

## 2. Functional Requirements

### 2.1 Authentication and Users

| ID | Requirement |
|----|-------------|
| FR-AUTH-01 | Users must authenticate via Supabase Auth (email/password initially). |
| FR-AUTH-02 | Admins can invite, activate, deactivate, and assign roles to users. |
| FR-AUTH-03 | Users can view and update their own profile (name, contact info). |
| FR-AUTH-04 | Password reset and session management must be supported by Supabase Auth. |
| FR-AUTH-05 | All authenticated routes must redirect unauthenticated users to login. |

### 2.2 Dashboard

| ID | Requirement |
|----|-------------|
| FR-DASH-01 | Dashboard shows key metrics: total products, low-stock count, recent sales, recent purchases. |
| FR-DASH-02 | Dashboard shows recent inventory movements. |
| FR-DASH-03 | Dashboard respects user role (employees see operational data; admins see admin shortcuts). |

### 2.3 Product Catalog

| ID | Requirement |
|----|-------------|
| FR-PROD-01 | Admins can create, edit, archive, and search products. |
| FR-PROD-02 | Products belong to one or more categories (hierarchical categories supported). |
| FR-PROD-03 | Products can have variants (e.g., size, color) with distinct SKU and barcode. |
| FR-PROD-04 | Each variant has a unique SKU within the organization. |
| FR-PROD-05 | Barcodes are optional but must be unique when provided. |
| FR-PROD-06 | Products store base attributes: name, description, unit of measure, cost price, sale price, status. |
| FR-PROD-07 | Variant-level pricing and cost overrides are supported when needed. |
| FR-PROD-08 | Product search supports name, SKU, and barcode. |

### 2.4 Categories

| ID | Requirement |
|----|-------------|
| FR-CAT-01 | Admins can create, edit, reorder, and archive categories. |
| FR-CAT-02 | Categories support parent/child hierarchy. |
| FR-CAT-03 | A product can be assigned to one primary category (extensible to multiple later). |

### 2.5 Warehouses

| ID | Requirement |
|----|-------------|
| FR-WH-01 | MVP operates with one default warehouse; warehouse entity exists from the start. |
| FR-WH-02 | All inventory balances and movements are scoped to a warehouse. |
| FR-WH-03 | Admins can manage warehouse metadata (name, code, address, status). |
| FR-WH-04 | Architecture must allow warehouse transfers without schema redesign. |

### 2.6 Inventory

| ID | Requirement |
|----|-------------|
| FR-INV-01 | System tracks on-hand quantity per product variant per warehouse. |
| FR-INV-02 | On-hand quantity is derived and maintained through inventory movements, not direct edits. |
| FR-INV-03 | Users can view current stock levels with filtering by product, category, warehouse, and low-stock status. |
| FR-INV-04 | Users can view full movement history for any variant/warehouse. |
| FR-INV-05 | Stock adjustments require a reason, quantity, and authorized user. |
| FR-INV-06 | Damaged and lost inventory are recorded as dedicated movement types with mandatory notes. |
| FR-INV-07 | Initial stock entry is supported when onboarding existing inventory. |
| FR-INV-08 | Inventory must never go negative due to concurrent operations. |

### 2.7 Purchases and Suppliers

| ID | Requirement |
|----|-------------|
| FR-PUR-01 | Admins can manage suppliers (name, contact, tax ID, payment terms, status). |
| FR-PUR-02 | Users can create purchase orders with line items (variant, quantity, unit cost). |
| FR-PUR-03 | Purchase orders have statuses: draft, ordered, partially received, received, cancelled. |
| FR-PUR-04 | Receiving goods creates inventory movements and updates purchase receipt status. |
| FR-PUR-05 | Partial receiving is supported. |
| FR-PUR-06 | Received quantity and cost are captured at receipt time. |
| FR-PUR-07 | Purchase history is searchable and auditable. |

### 2.8 Sales and Customers

| ID | Requirement |
|----|-------------|
| FR-SALE-01 | Users can manage customers (name, contact, tax ID, notes). |
| FR-SALE-02 | Users can create sales with line items (variant, quantity, unit price). |
| FR-SALE-03 | Completing a sale decrements inventory via inventory movements. |
| FR-SALE-04 | Sales support discounts at line or order level (admin-configurable limits for employees). |
| FR-SALE-05 | Sales have statuses: draft, completed, cancelled, partially returned. |
| FR-SALE-06 | Sales history is searchable by customer, date, product, and sale number. |
| FR-SALE-07 | Sale prices used at transaction time are stored on sale items (price snapshot). |

### 2.9 Returns

| ID | Requirement |
|----|-------------|
| FR-RET-01 | Users can process returns against completed sales. |
| FR-RET-02 | Returns restore inventory through inventory movements when goods are restockable. |
| FR-RET-03 | Non-restockable returns (damaged) route to damage movement types. |
| FR-RET-04 | Partial returns are supported. |
| FR-RET-05 | Return records link to original sale and sale items. |

### 2.10 Reports

| ID | Requirement |
|----|-------------|
| FR-RPT-01 | Inventory valuation report (quantity × cost). |
| FR-RPT-02 | Low-stock report based on configurable reorder thresholds. |
| FR-RPT-03 | Sales summary by date range. |
| FR-RPT-04 | Purchase summary by date range. |
| FR-RPT-05 | Movement history export (CSV). |
| FR-RPT-06 | Reports respect role permissions and warehouse scope. |

### 2.11 Alerts and Notifications

| ID | Requirement |
|----|-------------|
| FR-ALT-01 | Low-stock alerts when quantity falls at or below reorder point. |
| FR-ALT-02 | Alerts visible in-app on dashboard. |
| FR-ALT-03 | Automated notifications via n8n (email, WhatsApp) in later phases. |

### 2.12 Audit History

| ID | Requirement |
|----|-------------|
| FR-AUD-01 | All inventory movements are immutable once recorded. |
| FR-AUD-02 | Sensitive actions (price changes, role changes, cancellations) are logged in audit log. |
| FR-AUD-03 | Admins can search audit history by user, entity, action, and date. |

### 2.13 Automation Integration

| ID | Requirement |
|----|-------------|
| FR-AUTO-01 | n8n can trigger read-only reports and notifications. |
| FR-AUTO-02 | n8n can invoke secure application APIs for approved automations. |
| FR-AUTO-03 | n8n must not write inventory directly to the database. |
| FR-AUTO-04 | WhatsApp Business notifications for low stock and daily summaries (future phase). |

---

## 3. Non-Functional Requirements

### 3.1 Performance

| ID | Requirement |
|----|-------------|
| NFR-PERF-01 | Product search returns results within 500 ms for catalogs up to 10,000 variants. |
| NFR-PERF-02 | Sale completion (including inventory movement) completes within 2 seconds under normal load. |
| NFR-PERF-03 | Dashboard metrics load within 3 seconds. |
| NFR-PERF-04 | Database queries for inventory balances use indexed lookups on `(warehouse_id, product_variant_id)`. |

### 3.2 Reliability and Data Integrity

| ID | Requirement |
|----|-------------|
| NFR-REL-01 | Inventory mutations are atomic (PostgreSQL transactions). |
| NFR-REL-02 | No inventory operation succeeds without a corresponding movement record. |
| NFR-REL-03 | System prevents negative stock through database constraints and application validation. |
| NFR-REL-04 | Idempotency keys or equivalent safeguards for automated/API inventory operations. |

### 3.3 Scalability

| ID | Requirement |
|----|-------------|
| NFR-SCAL-01 | Schema supports multiple warehouses without migration of core tables. |
| NFR-SCAL-02 | Schema supports multiple branches/organizations in future via tenant/branch identifiers. |
| NFR-SCAL-03 | Read-heavy reporting can use database views or read replicas in production. |

### 3.4 Usability

| ID | Requirement |
|----|-------------|
| NFR-UX-01 | Application is responsive (desktop-first, usable on tablet). |
| NFR-UX-02 | All list views support search, sort, and pagination. |
| NFR-UX-03 | Forms provide inline validation and clear error messages. |
| NFR-UX-04 | Empty, loading, and error states are implemented for all major views. |

### 3.5 Maintainability

| ID | Requirement |
|----|-------------|
| NFR-MAINT-01 | TypeScript strict mode across the codebase. |
| NFR-MAINT-02 | Business logic separated from UI components. |
| NFR-MAINT-03 | Server-side validation mirrors client-side validation rules. |
| NFR-MAINT-04 | Documentation in `/docs` is updated when architecture changes. |

### 3.6 Availability and Deployment

| ID | Requirement |
|----|-------------|
| NFR-AVAIL-01 | Deployed on Vercel with Supabase managed PostgreSQL. |
| NFR-AVAIL-02 | Production builds must pass before deployment. |
| NFR-AVAIL-03 | Database migrations are version-controlled and applied in order. |

### 3.7 Observability

| ID | Requirement |
|----|-------------|
| NFR-OBS-01 | Server errors are logged with correlation IDs. |
| NFR-OBS-02 | Failed inventory operations log sufficient context for debugging without exposing secrets. |

---

## 4. User Roles

### 4.1 Admin

Full system access within the organization.

**Capabilities:**

- Manage users and roles.
- Manage products, categories, variants, suppliers, customers, warehouses.
- Create and receive purchase orders.
- Create, complete, and cancel sales.
- Perform stock adjustments, damage, and loss entries.
- View all reports and audit logs.
- Configure reorder points and system settings.
- Approve or override employee actions where policy allows.

### 4.2 Employee

Operational access for day-to-day work.

**Capabilities:**

- View products, categories, and inventory levels.
- Create and complete sales.
- Process returns (within policy).
- Create draft purchase orders (optional: submit for admin approval).
- Receive purchases if granted permission.
- Perform stock adjustments only if explicitly permitted (default: view only).
- View operational reports assigned to their role.

**Restrictions:**

- Cannot manage users or roles.
- Cannot delete/archive products without admin permission.
- Cannot modify cost prices or reorder points (default).
- Cannot access full audit log (default).

### 4.3 Future Roles (Post-MVP)

Architecture must support additional roles without redesign:

- **Branch Manager** — full access scoped to one branch.
- **Warehouse Operator** — inventory and receiving only.
- **Sales Agent** — sales and customers only.
- **Accountant** — read-only financial and inventory reports.

Permissions will be granular (resource + action) in future phases; MVP implements role-based access with Admin and Employee.

---

## 5. Main Use Cases

### UC-01: User Login

**Actor:** Any user  
**Flow:** User enters credentials → Supabase Auth validates → session established → redirect to dashboard.  
**Postcondition:** Authenticated session with role loaded server-side.

### UC-02: Create Product with Variants

**Actor:** Admin  
**Flow:** Admin creates product → assigns category → adds variants with SKU/barcode/prices → saves.  
**Postcondition:** Product and variants exist; no inventory until movements are recorded.

### UC-03: Record Initial Stock

**Actor:** Admin  
**Flow:** Admin selects variant and warehouse → enters quantity and reason → system creates `initial_stock` movement → balance updated.  
**Postcondition:** On-hand quantity reflects entry; movement is auditable.

### UC-04: Create and Receive Purchase Order

**Actor:** Admin (Employee may create draft)  
**Flow:** Create PO with supplier and line items → mark as ordered → on receipt, enter received quantities → system creates `purchase_receipt` movements.  
**Postcondition:** Inventory increased; PO status updated; costs recorded.

### UC-05: Complete a Sale

**Actor:** Employee or Admin  
**Flow:** Select customer (optional) → add line items → apply discounts → complete sale → system validates stock → creates `sale` movements → records sale.  
**Postcondition:** Inventory decreased; sale recorded with price snapshots.

### UC-06: Process a Return

**Actor:** Employee or Admin  
**Flow:** Locate original sale → select items to return → specify restockable or damaged → system creates `sale_return` or `damage` movements.  
**Postcondition:** Inventory adjusted; return linked to sale.

### UC-07: Stock Adjustment

**Actor:** Admin (or permitted Employee)  
**Flow:** Select variant/warehouse → enter adjustment quantity (+/−) and reason → system creates adjustment movement.  
**Postcondition:** Balance updated; reason stored.

### UC-08: Record Damaged or Lost Inventory

**Actor:** Admin  
**Flow:** Select variant/warehouse → enter quantity and notes → system creates `damage` or `loss` movement.  
**Postcondition:** Inventory reduced; reason immutable in movement record.

### UC-09: View Low-Stock Report

**Actor:** Admin or Employee  
**Flow:** User opens low-stock report → system compares on-hand vs reorder point → displays list.  
**Postcondition:** Actionable list for replenishment.

### UC-10: Search Movement History

**Actor:** Admin or Employee  
**Flow:** User filters by product, date, movement type, warehouse → views paginated history.  
**Postcondition:** Full traceability displayed.

### UC-11: Manage Users

**Actor:** Admin  
**Flow:** Admin invites user → assigns role → user activates account.  
**Postcondition:** User can authenticate with assigned permissions.

### UC-12: Automated Low-Stock Notification

**Actor:** n8n (scheduled)  
**Flow:** n8n calls read API or database view → evaluates low-stock items → sends WhatsApp/email notification.  
**Postcondition:** Stakeholders notified; no inventory mutation by n8n.

---

## 6. Business Rules

### 6.1 General

| ID | Rule |
|----|------|
| BR-GEN-01 | Every business entity record belongs to an organization (MVP: single default organization). |
| BR-GEN-02 | Archived/deleted entities are soft-deleted; historical transactions remain intact. |
| BR-GEN-03 | Monetary values use decimal precision appropriate for currency (numeric(12,2) minimum). |
| BR-GEN-04 | All timestamps stored in UTC; displayed in organization timezone. |
| BR-GEN-05 | Document numbers (sale, purchase, return) are unique and sequential per organization. |

### 6.2 Products and Pricing

| ID | Rule |
|----|------|
| BR-PROD-01 | SKU is mandatory and unique per organization. |
| BR-PROD-02 | Barcode is optional; when set, must be unique per organization. |
| BR-PROD-03 | Sale price on completed sales is snapshotted on sale items; later price changes do not alter history. |
| BR-PROD-04 | Cost price updates do not retroactively change historical purchase or valuation snapshots. |
| BR-PROD-05 | A product must have at least one variant (simple products use a default variant). |

### 6.3 Sales

| ID | Rule |
|----|------|
| BR-SALE-01 | A sale cannot be completed if any line item exceeds available stock. |
| BR-SALE-02 | Cancelled sales do not affect inventory unless previously completed (then require reversal movements). |
| BR-SALE-03 | Discounts cannot reduce line total below zero. |
| BR-SALE-04 | Completed sales are immutable except through formal return process. |

### 6.4 Purchases

| ID | Rule |
|----|------|
| BR-PUR-01 | Received quantity cannot exceed ordered quantity without admin override. |
| BR-PUR-02 | Unit cost at receipt is stored on receipt line; used for inventory valuation. |
| BR-PUR-03 | Cancelled purchase orders cannot be received. |

### 6.5 Returns

| ID | Rule |
|----|------|
| BR-RET-01 | Returned quantity cannot exceed originally sold quantity minus prior returns. |
| BR-RET-02 | Restockable returns increase inventory; damaged returns do not increase sellable stock. |

### 6.6 Users and Access

| ID | Rule |
|----|------|
| BR-USER-01 | At least one active Admin must exist at all times. |
| BR-USER-02 | Deactivated users cannot authenticate. |
| BR-USER-03 | Role changes take effect on next request (server-side enforcement). |

---

## 7. Inventory Rules

These rules are **critical** and must never be violated.

| ID | Rule |
|----|------|
| IR-01 | **Movements are the source of truth.** Every stock change creates an `inventory_movement` record. |
| IR-02 | **Balances are derived state.** `inventory_balance` (on-hand per variant/warehouse) is updated only inside the same transaction that creates the movement. |
| IR-03 | **No direct stock edits.** UI and APIs must not expose a "set stock to X" operation without generating adjustment movements. |
| IR-04 | **No negative stock.** Database constraints and transactional checks prevent `quantity_on_hand < 0`. |
| IR-05 | **Atomic operations.** Sale, purchase receipt, adjustment, return, transfer, damage, and loss operations run in a single PostgreSQL transaction. |
| IR-06 | **Concurrency safety.** Balance updates use row-level locking (`SELECT ... FOR UPDATE`) or equivalent to prevent race conditions. |
| IR-07 | **Movement immutability.** Recorded movements are never deleted or edited; corrections are made via reversing/adjustment movements. |
| IR-08 | **Movement types are explicit.** Each movement has a typed reason: `initial_stock`, `purchase_receipt`, `sale`, `sale_return`, `adjustment_increase`, `adjustment_decrease`, `damage`, `loss`, `transfer_in`, `transfer_out`. |
| IR-09 | **Reference linking.** Movements link to originating documents (sale_id, purchase_receipt_id, adjustment_id, etc.). |
| IR-10 | **Warehouse scoping.** All movements and balances include `warehouse_id`. MVP uses one default warehouse. |
| IR-11 | **Cost tracking.** Purchase receipt movements store unit cost for valuation; sale movements do not alter cost basis (FIFO/average costing is a future enhancement). |
| IR-12 | **Idempotency for integrations.** API endpoints that create movements accept idempotency keys to prevent duplicate processing. |

### 7.1 Inventory Movement Lifecycle

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│ Business Action │────▶│ Validate + Lock Row  │────▶│ Insert Movement     │
│ (sale, receipt) │     │ (balance row)        │     │ (typed, linked)     │
└─────────────────┘     └──────────────────────┘     └──────────┬──────────┘
                                                                │
                                                                ▼
                                                     ┌─────────────────────┐
                                                     │ Update Balance      │
                                                     │ (same transaction)  │
                                                     └─────────────────────┘
```

### 7.2 Balance Reconciliation

Periodic reconciliation (admin tool, future phase) compares sum of movements vs balance table. Discrepancies trigger alerts; balance table is authoritative for reads, movements for audit.

---

## 8. Security Requirements

### 8.1 Authentication

| ID | Requirement |
|----|-------------|
| SEC-AUTH-01 | All users authenticate through Supabase Auth. |
| SEC-AUTH-02 | Sessions use HTTP-only cookies via Supabase SSR integration. |
| SEC-AUTH-03 | Password policy follows Supabase project settings (minimum length, complexity). |
| SEC-AUTH-04 | Unauthenticated API requests receive 401; unauthorized receive 403. |

### 8.2 Authorization

| ID | Requirement |
|----|-------------|
| SEC-AUTHZ-01 | Role and permission checks occur server-side on every mutation. |
| SEC-AUTHZ-02 | PostgreSQL Row Level Security (RLS) enforces organization-scoped data access. |
| SEC-AUTHZ-03 | Client-side role checks are for UX only; never trusted for security. |
| SEC-AUTHZ-04 | Service role key is used only in secure server contexts, never exposed to browser. |

### 8.3 Data Protection

| ID | Requirement |
|----|-------------|
| SEC-DATA-01 | All traffic over HTTPS in production. |
| SEC-DATA-02 | Secrets stored in environment variables; `.env.local` never committed. |
| SEC-DATA-03 | PII (customer contact info) accessible only to authorized roles. |
| SEC-DATA-04 | Database backups enabled via Supabase; recovery procedure documented. |

### 8.4 Input Validation

| ID | Requirement |
|----|-------------|
| SEC-INPUT-01 | All API inputs validated with schema validation (e.g., Zod) server-side. |
| SEC-INPUT-02 | SQL injection prevented via parameterized queries (Supabase client/ORM). |
| SEC-INPUT-03 | XSS prevented via React escaping and Content Security Policy headers. |

### 8.5 Audit and Compliance

| ID | Requirement |
|----|-------------|
| SEC-AUDIT-01 | Inventory movements record `created_by` user ID. |
| SEC-AUDIT-02 | Admin actions on users, roles, and prices are audit-logged. |
| SEC-AUDIT-03 | Audit logs are append-only. |

### 8.6 Automation and API Security

| ID | Requirement |
|----|-------------|
| SEC-API-01 | n8n integrations use scoped API keys or service tokens with minimal permissions. |
| SEC-API-02 | Automation endpoints rate-limited and logged. |
| SEC-API-03 | n8n cannot bypass inventory movement rules via direct database writes in production. |

---

## 9. Assumptions and Constraints

- Single organization and single warehouse for MVP.
- Spanish or bilingual UI is acceptable; i18n architecture deferred.
- One currency per organization for MVP.
- Supabase is the database and auth provider.
- Vercel hosts the Next.js application.
- n8n is self-hosted or cloud-hosted separately from the main app.

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Variant** | A sellable SKU-level item (e.g., "T-Shirt — Red — Large"). |
| **Movement** | An immutable record of inventory quantity change. |
| **Balance** | Current on-hand quantity for a variant in a warehouse. |
| **Receipt** | Recording goods received against a purchase order. |
| **Reorder point** | Threshold triggering low-stock alerts. |
| **Organization** | Top-level tenant; MVP uses one default org. |
