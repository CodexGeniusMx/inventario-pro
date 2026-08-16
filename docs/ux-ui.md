# Inventario Pro — UX/UI Design System

## 1. Design Philosophy

Inventario Pro is a **productivity application** used daily by employees and administrators to manage inventory, sales, and purchases. It is not a marketing site.

### 1.1 Design Goals

| Goal | Expression in UI |
|------|------------------|
| **Professional** | Neutral palette, consistent spacing, no decorative clutter |
| **Modern** | shadcn/ui components, subtle shadows, clean typography |
| **Fast** | Server Components for lists, optimistic UI only where safe, keyboard shortcuts on POS |
| **Clean** | White/neutral surfaces, clear borders, generous whitespace within compact density |
| **Compact** | Dense tables, inline actions, collapsible filters — maximize data per viewport |
| **Trustworthy** | Confirm destructive actions, show audit context, never hide inventory impact |
| **Easy to learn** | Predictable layout, consistent patterns, labels over icons alone |
| **Daily-use optimized** | Quick actions in header, global search, low click count for top workflows |

### 1.2 Design Principles

1. **Clarity over decoration** — every element earns its place.
2. **Scan first, drill down second** — lists and dashboards optimize for at-a-glance reading.
3. **Actions near data** — row actions, contextual toolbars, no mystery meat navigation.
4. **Inventory impact is visible** — stock changes always show what will happen before confirm.
5. **Role-aware, not role-confusing** — hide unauthorized actions; never show broken controls.
6. **Consistent patterns** — one way to search, one way to filter, one way to confirm deletes.
7. **Desktop-first, tablet-ready** — full workflows on desktop; essential workflows on tablet.

### 1.3 Personas

| Persona | Primary tasks | UX priority |
|---------|---------------|-------------|
| **Employee** | Sales, stock lookup, customer lookup | Speed, POS flow, search |
| **Admin** | Catalog, purchases, adjustments, users, reports | Control, audit visibility, bulk operations |
| **Owner/Manager** | Dashboard, reports, low-stock | Overview metrics, alerts |

---

## 2. Information Architecture

### 2.1 Top-Level Domains

```
Inventario Pro
├── Operations (daily use)
│   ├── Dashboard
│   ├── Sales (+ New Sale / POS)
│   ├── Returns
│   └── Customers
├── Inventory
│   ├── Stock Overview
│   ├── Movements
│   ├── Adjustments
│   └── Damaged / Lost
├── Catalog
│   ├── Products
│   └── Categories
├── Purchasing
│   ├── Purchase Orders
│   ├── Receive Goods
│   └── Suppliers
├── Insights
│   ├── Reports
│   └── Low-Stock Alerts
└── Administration (Admin only)
    ├── Users
    ├── Roles & Permissions (future granular; MVP: role on user)
    ├── Audit Log
    └── Settings
```

### 2.2 Content Hierarchy (Per Page)

Every authenticated page follows this hierarchy:

```
1. Page title + primary action (top)
2. Context bar: search, filters, view toggles
3. Main content: table | form | split panel
4. Secondary detail: drawer | side panel | bottom section
5. Pagination / summary footer
```

### 2.3 Task Frequency Map

High-frequency tasks get the shortest paths:

| Task | Target clicks from dashboard | Entry point |
|------|------------------------------|-------------|
| New sale | 1 | Header "New Sale" button |
| Find product / stock | 1 | Global search (Cmd+K) |
| Receive purchase | 2 | Purchasing → PO → Receive |
| Adjust stock | 2 | Inventory → Adjust |
| Create product | 2 | Products → New Product |
| View low stock | 1 | Dashboard alert / sidebar badge |

---

## 3. Sitemap

### 3.1 Public Routes

| Route | Screen |
|-------|--------|
| `/login` | Login |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form |

### 3.2 Authenticated Routes

| Route | Screen | Role |
|-------|--------|------|
| `/dashboard` | Dashboard | All |
| `/sales` | Sales list | All |
| `/sales/new` | New sale (POS) | All |
| `/sales/[id]` | Sale detail | All |
| `/sales/[id]/return` | Process return | All |
| `/customers` | Customers list | All |
| `/customers/[id]` | Customer detail | All |
| `/inventory` | Inventory overview | All |
| `/inventory/movements` | Movement history | All |
| `/inventory/adjustments` | Stock adjustments | Admin* |
| `/inventory/damaged-lost` | Damaged / lost | Admin |
| `/products` | Products list | All (read); Admin (write) |
| `/products/new` | Create product | Admin |
| `/products/[id]` | Product detail | All |
| `/products/[id]/edit` | Edit product | Admin |
| `/categories` | Categories | Admin (write); All (read) |
| `/purchases` | Purchase orders | All (read); Admin (write) |
| `/purchases/new` | Create PO | Admin |
| `/purchases/[id]` | PO detail + receive | Admin |
| `/suppliers` | Suppliers | Admin (write); All (read) |
| `/reports` | Reports hub | All (scoped) |
| `/reports/[slug]` | Individual report | All (scoped) |
| `/alerts/low-stock` | Low-stock list | All |
| `/users` | Users | Admin |
| `/users/[id]` | User detail | Admin |
| `/audit` | Audit log | Admin |
| `/settings` | Settings | Admin |
| `/settings/profile` | My profile | All |

*Employee adjustments configurable per requirements; UI supports permission flag.

### 3.3 Route Groups (Next.js)

```
app/
  (auth)/          → login, forgot-password
  (app)/           → authenticated shell
    dashboard/
    sales/
    customers/
    inventory/
    products/
    categories/
    purchases/
    suppliers/
    reports/
    alerts/
    users/
    audit/
    settings/
```

---

## 4. Main Navigation

### 4.1 Structure

Primary navigation lives in a **persistent left sidebar**. Secondary navigation uses **in-page tabs** or **sub-nav** within a module.

| Group | Items | Icon (Lucide) |
|-------|-------|---------------|
| **Operations** | Dashboard | `LayoutDashboard` |
| | Sales | `ShoppingCart` |
| | Customers | `Users` |
| **Inventory** | Stock | `Package` |
| | Movements | `ArrowLeftRight` |
| | Adjustments | `SlidersHorizontal` |
| | Damaged / Lost | `PackageX` |
| **Catalog** | Products | `Tag` |
| | Categories | `FolderTree` |
| **Purchasing** | Purchase Orders | `ClipboardList` |
| | Suppliers | `Truck` |
| **Insights** | Reports | `BarChart3` |
| | Low Stock | `AlertTriangle` |
| **Admin** | Users | `UserCog` |
| | Audit Log | `History` |
| | Settings | `Settings` |

Admin group visible only to Admin role.

### 4.2 Navigation Behavior

- Active item: `sidebar-accent` background + primary text weight.
- Hover: subtle accent background.
- Collapsed sidebar (icon-only): 64px width; tooltips on hover.
- Expanded sidebar: 240px width; default on desktop ≥1280px.
- Low-stock badge on **Low Stock** nav item and **Stock** when count > 0.

### 4.3 Quick Actions (Always Visible)

Header right section:

| Action | Label | Role | Style |
|--------|-------|------|-------|
| New Sale | `New Sale` | All | Primary button |
| Global search | Search icon + `⌘K` | All | Ghost button → Command dialog |

Admin additional dropdown (`+` or `More actions`):

- New Product
- New Purchase Order
- Adjust Stock
- Record Damage/Loss

---

## 5. Sidebar

### 5.1 Anatomy

```
┌─────────────────────────┐
│ [Logo] Inventario Pro   │  ← Brand + org name (truncated)
├─────────────────────────┤
│ OPERATIONS              │  ← Group label (text-xs, muted)
│   Dashboard             │
│   Sales                 │
│   Customers             │
│ INVENTORY               │
│   Stock            (3)  │  ← Badge for low-stock count
│   ...                   │
├─────────────────────────┤
│ [◀ Collapse]            │  ← Footer toggle
└─────────────────────────┘
```

### 5.2 Specifications

| Property | Value |
|----------|-------|
| Width expanded | 240px |
| Width collapsed | 64px |
| Background | `--sidebar` |
| Border | 1px right `--sidebar-border` |
| Group label | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |
| Item height | 36px (compact) |
| Item padding | `px-3 py-2` |
| Icon size | 16px |
| Badge | shadcn `Badge` variant `destructive` or `secondary` for counts |

### 5.3 Mobile/Tablet

- Sidebar hidden by default on `< lg` (1024px).
- Opens as **Sheet** (drawer from left) via hamburger in header.
- Closes on navigation or overlay tap.

---

## 6. Header / Topbar

### 6.1 Anatomy

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [☰]  Page Title                    [⌘K Search]  [New Sale]  [?] [Avatar] │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Elements

| Element | Purpose |
|---------|---------|
| Menu toggle | Opens sidebar sheet on tablet/mobile |
| Page title | Current page name (breadcrumb optional on detail pages) |
| Global search | Command palette: products, customers, sales by number |
| New Sale | Primary CTA — always visible |
| Help (?) | Links to docs / keyboard shortcuts (future) |
| Avatar menu | Profile, settings, logout |

### 6.3 Specifications

| Property | Value |
|----------|-------|
| Height | 56px |
| Background | `--background` |
| Border | 1px bottom `--border` |
| Sticky | Yes — remains visible on scroll |
| Avatar dropdown | shadcn `DropdownMenu` |

### 6.4 Breadcrumbs

Used on detail and nested pages only:

`Products / Wireless Mouse / Edit`

- shadcn `Breadcrumb` component.
- Max 3 visible segments; truncate middle if deeper.

---

## 7. Dashboard Layout

### 7.1 Grid Structure (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│  Low-stock alert banner (conditional)                           │
├────────────┬────────────┬────────────┬────────────────────────────┤
│  Products  │  Low Stock │  Sales     │  Purchases                 │
│  (metric)  │  (metric)  │  Today     │  Pending                   │
├────────────┴────────────┴────────────┴────────────────────────────┤
│  Recent Sales (table, 5 rows)    │  Recent Movements (5 rows)   │
├──────────────────────────────────┴───────────────────────────────┤
│  Quick Actions: [New Sale] [Receive PO] [Adjust Stock] [Reports]│
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Metric Cards

- shadcn `Card` with compact padding (`p-4`).
- Label: `text-sm text-muted-foreground`.
- Value: `text-2xl font-semibold tabular-nums`.
- Optional trend or sub-label (e.g., "vs yesterday" — future).

### 7.3 Role Variations

| Element | Employee | Admin |
|---------|----------|-------|
| Low-stock banner | Yes | Yes |
| Admin quick links | Hidden | Users, Settings |
| Pending PO metric | Read-only | Full |

---

## 8. Table Patterns

### 8.1 Standard Data Table

Primary component: shadcn `Table` inside a `Card` with zero padding on table wrapper.

| Feature | Pattern |
|---------|---------|
| Row height | 40px (compact), 48px (default) — use **compact** for inventory/sales |
| Column alignment | Text left; numbers right; actions right |
| Sortable columns | Click header → asc/desc indicator (Lucide `ArrowUpDown`) |
| Row click | Navigates to detail (except action column) |
| Row hover | `bg-muted/50` |
| Selection | Checkbox column for bulk actions (admin, future) |
| Sticky header | On tables with vertical scroll (>15 rows) |
| Pagination | Bottom: "Showing 1–25 of 340" + prev/next + page size select |

### 8.2 Column Types

| Type | Format |
|------|--------|
| Text | Truncate with tooltip if > 40 chars |
| Number/qty | `tabular-nums`, right-aligned |
| Money | `$1,234.56`, right-aligned |
| Date | `Aug 16, 2026` or relative for today (`2 hours ago`) |
| Status | Badge (see §25) |
| SKU/Barcode | `font-mono text-sm` |
| Actions | Icon buttons or `DropdownMenu` (⋯) |

### 8.3 Inline Stock Indicator

In product and inventory tables:

| Condition | Display |
|-----------|---------|
| In stock | qty in default text |
| Low stock | qty in `text-amber-600` + `Badge` "Low" |
| Out of stock | `0` in `text-destructive` + `Badge` "Out" |

### 8.4 Empty Table

Centered within table body — see §14.

---

## 9. Search Patterns

### 9.1 Global Search (Command Palette)

- Trigger: `Cmd+K` / `Ctrl+K` or header search button.
- Component: shadcn `Command` inside `Dialog`.
- Searches: products (name, SKU, barcode), customers, sales (by number).
- Results grouped by type with icons.
- Enter → navigate to detail; Sale → `/sales/[id]`.

### 9.2 Page-Level Search

- Position: top of content area, left of filters.
- Component: shadcn `Input` with `Search` icon in `InputGroup`.
- Placeholder: contextual (`Search products by name, SKU, or barcode…`).
- Debounce: 300ms.
- Updates URL search params for shareable/bookmarkable state.
- Clear button (×) when query non-empty.

### 9.3 Product Picker Search (POS / PO / Adjustments)

- Combobox pattern: shadcn `Popover` + `Command`.
- Scan-friendly: input stays focused; barcode scanner sends Enter.
- Shows: product name, variant, SKU, **available stock**.
- Out-of-stock variants shown disabled with reason.

---

## 10. Filter Patterns

### 10.1 Filter Bar Layout

```
[ Search input                    ] [ Category ▼ ] [ Status ▼ ] [ Date range ] [ Clear filters ]
```

### 10.2 Filter Types

| Type | Component |
|------|-----------|
| Single select | shadcn `Select` |
| Multi-select | `Popover` + checkboxes (future) |
| Date range | Two date inputs or preset chips: Today, 7d, 30d, Custom |
| Boolean toggle | shadcn `Toggle` or checkbox chip: "Low stock only" |
| Warehouse | `Select` (when multi-warehouse enabled) |

### 10.3 Filter Behavior

- Filters persist in URL query params.
- Active filter count badge on filter button (mobile).
- "Clear filters" link appears when any filter active.
- Mobile: filters collapse into `Sheet` with "Apply" button.

### 10.4 Common Filter Sets

| Screen | Filters |
|--------|---------|
| Products | Category, status (active/archived), low stock |
| Inventory | Category, warehouse, low stock, out of stock |
| Movements | Type, date range, product, warehouse |
| Sales | Date range, status, customer |
| Purchases | Status, supplier, date range |
| Users | Role, status (active/inactive) |

---

## 11. Form Patterns

### 11.1 Layout Types

| Type | Use case |
|------|----------|
| **Single-column form** | Create/edit entity (product, customer, supplier) |
| **Two-column form** | Wider screens: labels left, fields right — or 2-col grid for short fields |
| **Inline table editor** | PO line items, sale line items, variant rows |
| **Stepped form** | Not used in MVP — prefer single page with sections |

### 11.2 Form Anatomy

```
Section title
Section description (optional, muted)

Label *
[ Input                                    ]
Helper text / error message

─────────── (Separator between sections)
[ Cancel ]  [ Save ]
```

### 11.3 Field Components

| Field | Component |
|-------|-----------|
| Text | `Input` |
| Textarea | `Textarea` |
| Number | `Input type="number"` with `tabular-nums` |
| Money | `Input` with currency prefix in `InputGroup` |
| Select | `Select` |
| Category tree | `Select` with indented options |
| Date | `Input type="date"` |
| Toggle | `Switch` for active/inactive |
| Role | `Select` with Admin/Employee |

### 11.4 Validation UX

- Validate on blur for individual fields.
- Validate all on submit.
- Error: red border + `text-destructive text-sm` below field.
- Disable submit while submitting; show spinner in button.
- Unsaved changes: browser `beforeunload` warning on full-page forms.

### 11.5 Variant Editor (Products)

Inline editable table:

| Variant name | SKU | Barcode | Cost | Price | Reorder | Actions |
|--------------|-----|---------|------|-------|---------|---------|
| Default | … | … | … | … | … | Remove |

- "Add variant" button below table.
- Minimum one variant enforced.

---

## 12. Modal / Dialog Usage

### 12.1 When to Use Each

| Component | Use case |
|-----------|----------|
| **Dialog** | Confirmations, small forms (≤5 fields), adjust stock, record damage |
| **Sheet** | Mobile nav, filter panel, secondary detail on tablet |
| **Drawer (custom / Sheet right)** | Variant detail, movement detail, quick preview |
| **Full page** | Create product, new sale (POS), create PO |
| **AlertDialog** | Destructive confirmations only |

### 12.2 Dialog Sizes

| Size | Width | Use |
|------|-------|-----|
| sm | 400px | Confirm delete, simple prompt |
| md | 512px | Adjust stock, add customer quick |
| lg | 640px | Receive goods summary |
| full | 90vw | Not default — prefer full page |

### 12.3 Dialog Rules

- Title: action-oriented ("Adjust stock", not "Modal").
- Primary action right; Cancel left.
- Escape and overlay click close non-destructive dialogs (not mid-submit).
- Focus trap automatic via shadcn Dialog.

---

## 13. Confirmation Flows

### 13.1 Severity Levels

| Level | Pattern | Example |
|-------|---------|---------|
| **Low** | Direct action + toast | Save product |
| **Medium** | Dialog with summary | Complete sale, receive goods |
| **High** | AlertDialog + typed confirm (future) | Delete org, bulk archive |
| **Destructive** | AlertDialog, red button, explicit consequence | Cancel PO, deactivate user, archive product |

### 13.2 Inventory-Bearing Confirmations

Always show **inventory impact summary** before confirm:

```
Complete sale?
─────────────────────────
3 line items · Total: $156.00
Stock to deduct:
  • Wireless Mouse × 2  (12 → 10)
  • USB Cable × 5       (40 → 35)
─────────────────────────
[ Cancel ]  [ Complete Sale ]
```

### 13.3 Irreversible Actions

Copy must state consequence:

- "Archive product" → "Product will be hidden from sales and search. Existing history is preserved."
- "Deactivate user" → "User will not be able to log in."
- Movements are never deleted — UI must not offer "delete movement".

---

## 14. Loading States

### 14.1 Patterns

| Context | Component |
|---------|-----------|
| Full page initial load | `Skeleton` layout matching page structure |
| Table data | 5–10 skeleton rows |
| Metric cards | Skeleton rectangles |
| Button action | Button `disabled` + Lucide `Loader2` spin |
| Inline refresh | Subtle spinner in table header |
| POS product search | Skeleton list items in combobox |

### 14.2 Rules

- Skeleton shapes match final content dimensions.
- Avoid full-page spinner except auth redirect.
- Stale-while-revalidate: show previous data with opacity overlay during refresh (optional).
- Loading > 3s: show "Still loading…" text.

---

## 15. Empty States

### 15.1 Anatomy

```
        [ Icon — muted, 48px ]
        No products yet
        Create your first product to start tracking inventory.
        [ Create Product ]  (primary, admin only)
```

### 15.2 Copy Guidelines

- Title: what's missing ("No sales today").
- Description: one sentence, actionable.
- CTA: primary action for the role.
- No empty state for search results — use "No results for '{query}'" with clear-filters link.

### 15.3 Screen-Specific Empty States

| Screen | Title | CTA |
|--------|-------|-----|
| Products | No products yet | Create Product |
| Sales | No sales found | New Sale |
| Inventory | No inventory recorded | Record initial stock |
| Movements | No movements yet | Actions depend on context |
| Customers | No customers yet | Add Customer |
| Purchases | No purchase orders | Create PO |
| Low stock | All stock levels healthy | — (positive empty state) |
| Audit log | No audit events | — |

---

## 16. Error States

### 16.1 Error Types

| Type | Display |
|------|---------|
| Field validation | Inline under field |
| Form submit | Alert banner at top of form (`destructive` variant) |
| Page load failure | Full content replacement with retry button |
| Partial table error | Toast + empty table with error message |
| Insufficient stock | Inline on line item (POS/PO receive) |
| Permission denied | Empty state: "You don't have access" + link to dashboard |
| Network | Toast: "Connection lost. Check your network and try again." |

### 16.2 Error Page (404 / 500)

- Centered layout, outside dense app chrome or within shell.
- Clear message + `Go to Dashboard` button.

### 16.3 Toast vs Inline

- **Toast**: transient failures, success confirmations, background save.
- **Inline**: validation, stock conflicts, anything user must fix before proceeding.

---

## 17. Toast Notifications

### 17.1 Component

Use shadcn **Sonner** (`Toaster` in root layout).

### 17.2 When to Toast

| Event | Type | Message example |
|-------|------|-----------------|
| Save success | success | "Product saved" |
| Delete/archive success | success | "Product archived" |
| Sale completed | success | "Sale #1042 completed" |
| Stock adjusted | success | "Stock adjusted: +10 units" |
| Generic failure | error | "Something went wrong. Try again." |
| Copy to clipboard | success | "SKU copied" |

### 17.3 Rules

- Duration: 4s default; errors 6s or dismiss on click.
- No toast for navigation-only actions.
- Critical inventory errors use inline/dialog, not toast alone.
- Max one toast stack visible; newest replaces if flooding.

---

## 18. Responsive Behavior

### 18.1 Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| `sm` | 640px | Stack form columns |
| `md` | 768px | 2-col metric grid |
| `lg` | 1024px | Sidebar sheet → fixed sidebar |
| `xl` | 1280px | Full dashboard grid |
| `2xl` | 1536px | Max content width 1440px, centered |

### 18.2 Content Max Width

- List pages: fluid with `px-6` padding.
- Forms: `max-w-2xl` for single column; `max-w-4xl` for product with variants.
- POS: full width of content area.

### 18.3 Table Responsive

- `< md`: horizontal scroll on table wrapper with shadow hint.
- Priority columns visible; secondary columns hidden via `hidden md:table-cell`.
- Or: card list view toggle on mobile (future enhancement).

---

## 19. Desktop-First Behavior

### 19.1 Primary Target

- Minimum supported desktop: **1280×800**.
- Optimized for **1440×900** and **1920×1080**.

### 19.2 Desktop Affordances

- Hover states on rows and buttons.
- Keyboard shortcuts on POS and command palette.
- Multi-column layouts without stacking.
- Side-by-side panels (POS: cart left, catalog right — or reverse based on testing).
- Tooltips on collapsed sidebar icons.

### 19.3 Density Toggle (Future)

- Compact / Comfortable table density in user settings.
- MVP ships **compact** as default.

---

## 20. Mobile / Tablet Considerations

### 20.1 Tablet (768–1023px)

- Sidebar as sheet.
- POS usable: product search + cart stacked vertically.
- Tables scroll horizontally.
- Primary actions remain in header.

### 20.2 Mobile (<768px)

- **Supported for lookup**, not primary target.
- Dashboard metrics stack 2×2.
- POS functional but simplified: search → add → checkout flow vertical.
- Admin-heavy tasks (variant editor, PO creation) show banner: "Best experienced on desktop."

### 20.3 Touch Targets

- Minimum 44×44px for touch controls on tablet/mobile.
- Increase button size in header on `< lg`.

---

## 21. Accessibility Principles

### 21.1 Standards

- Target **WCAG 2.1 AA**.
- shadcn/ui components provide baseline ARIA; verify custom compositions.

### 21.2 Requirements

| Area | Requirement |
|------|-------------|
| Keyboard | Full tab navigation; Cmd+K global search; Enter submits forms |
| Focus | Visible focus ring (`ring` token); no focus trap except dialogs |
| Color | Never rely on color alone for status — use badge text |
| Labels | All inputs have visible `<Label>` or `aria-label` |
| Tables | `<th scope="col">`; caption or aria-label for data tables |
| Live regions | Toast announcements via Sonner |
| Motion | Respect `prefers-reduced-motion` |
| Contrast | 4.5:1 for body text; 3:1 for large text |

### 21.3 Screen Reader

- Page title updates via Next.js metadata.
- Status badges include text, not color only.
- Loading states use `aria-busy` on containers.

---

## 22. Visual Hierarchy

### 22.1 Level System

| Level | Element | Style |
|-------|---------|-------|
| L1 | Page title | `text-xl font-semibold` |
| L2 | Section title | `text-base font-medium` |
| L3 | Card title | `text-sm font-medium` |
| L4 | Body | `text-sm` |
| L5 | Caption/meta | `text-xs text-muted-foreground` |
| L6 | Data emphasis | `text-2xl font-semibold tabular-nums` (metrics) |

### 22.2 Emphasis Rules

- One primary action per screen region (solid primary button).
- Secondary actions: `outline` or `ghost`.
- Destructive: `destructive` variant only for irreversible actions.
- Muted text for timestamps, IDs, helper copy.
- Money totals: semibold; line items: regular.

---

## 23. Spacing System

### 23.1 Base Scale (Tailwind)

Use Tailwind default scale. Preferred values:

| Token | Use |
|-------|-----|
| `1` (4px) | Tight icon gaps |
| `2` (8px) | Inline element gaps |
| `3` (12px) | Form field internal |
| `4` (16px) | Card padding (compact), stack gaps |
| `6` (24px) | Section gaps, page padding horizontal |
| `8` (32px) | Major section separation |

### 23.2 Layout Spacing

| Area | Value |
|------|-------|
| Page padding | `p-6` |
| Card padding | `p-4` (compact) / `p-6` (spacious forms) |
| Form field gap | `space-y-4` |
| Section gap | `space-y-6` |
| Table cell padding | `px-3 py-2` (compact) |
| Sidebar item gap | `gap-1` in nav list |

### 23.3 Density Rule

When in doubt, choose the **tighter** option that preserves readability. Productivity users prefer seeing more rows over decorative spacing.

---

## 24. Typography

### 24.1 Font Stack

| Role | Font |
|------|------|
| UI / body | Geist Sans (`--font-sans`) — from Next.js layout |
| Code / SKU / barcode | Geist Mono (`--font-mono`) |
| Headings | Same as sans — weight differentiation only |

### 24.2 Scale

| Name | Class | Use |
|------|-------|-----|
| Page title | `text-xl font-semibold tracking-tight` | H1 per page |
| Section | `text-base font-medium` | H2 |
| Body | `text-sm` | Default UI text |
| Small | `text-xs` | Labels, badges, meta |
| Metric | `text-2xl font-semibold tabular-nums` | Dashboard numbers |
| Mono data | `text-sm font-mono` | SKU, barcode, sale # |

### 24.3 Rules

- No font size below `text-xs` (12px).
- `tabular-nums` on all numeric columns and totals.
- Sentence case for labels and buttons ("New sale", not "New Sale" — except proper nouns/branding).
- Truncate long product names with `truncate` + tooltip.

---

## 25. Status Colors and Badges

### 25.1 Badge Component

shadcn `Badge` with semantic variants.

### 25.2 Document Statuses

| Status | Variant | Color intent |
|--------|---------|--------------|
| Draft | `secondary` | Neutral gray |
| Completed / Received / Active | `default` | Primary/neutral dark |
| Ordered / Partial | `outline` | Border only |
| Partially received / Partially returned | `outline` + amber text | Warning in progress |
| Cancelled / Inactive / Archived | `secondary` | Muted |
| Low stock | custom amber | `bg-amber-100 text-amber-800` |
| Out of stock | `destructive` | Red |

### 25.3 Movement Types

| Type | Badge color |
|------|-------------|
| Sale | blue-muted |
| Purchase receipt | green-muted |
| Adjustment | gray |
| Damage / Loss | red-muted |
| Return | purple-muted |
| Initial stock | gray |
| Transfer | teal-muted (future) |

Use consistent badge text labels — never color alone.

### 25.4 Stock Level Colors

| Level | Text color |
|-------|------------|
| OK | default foreground |
| Low (≤ reorder point) | `text-amber-600` |
| Out (0) | `text-destructive` |

---

## 26. Data Density Rules

### 26.1 Default Density: Compact

| Element | Rule |
|---------|------|
| Table rows | 40px height |
| Form fields | Default shadcn height (not oversized) |
| Cards | Minimal padding (`p-4`) |
| Metrics | Single row per card, no extra chart junk in MVP |
| Dialogs | No excessive whitespace |

### 26.2 Information Priority (Tables)

Show highest-value columns first; hide on smaller screens:

**Products:** Name, SKU, Stock, Price, Status, Actions  
**Inventory:** Product, Variant, SKU, Qty, Reorder point, Status  
**Sales:** #, Date, Customer, Total, Status, Actions  
**Movements:** Date, Type, Product, Qty (+/−), User, Reference  

### 26.3 Avoid

- Card-in-card nesting beyond 2 levels.
- Full-width hero sections on list pages.
- Large avatars or illustrations in data views.
- Pagination blocks taller than one row.

---

## 27. Critical Action Styling

### 27.1 Primary Actions

| Action | Placement | Style |
|--------|-----------|-------|
| New Sale | Header, always | `Button` default (primary) |
| Complete Sale | POS footer sticky | Primary, full width on mobile |
| Receive Goods | PO detail header | Primary |
| Save | Form footer right | Primary |
| Record adjustment | Dialog footer | Primary |

### 27.2 Visual Weight

- One filled primary button per viewport region.
- Sticky footers for POS and long forms with primary action always visible.
- Critical inventory actions include icon: `Package`, `ShoppingCart`, `Truck`.

---

## 28. Destructive Action Handling

### 28.1 Destructive Actions List

| Action | Component | Confirm |
|--------|-----------|---------|
| Archive product | AlertDialog | "Archive" button destructive |
| Cancel purchase order | AlertDialog | State must be draft/ordered |
| Deactivate user | AlertDialog | Explain login impact |
| Cancel draft sale | AlertDialog | Low severity |
| Record damage/loss | Dialog (not AlertDialog) | Requires notes, but intentional |

### 28.2 Styling

- Button: `variant="destructive"`.
- Never use destructive for neutral actions (e.g., "Remove line item" in draft → `outline` or ghost).
- AlertDialog description explains what won't happen (e.g., "Historical movements are not deleted").

### 28.3 Disabled Destructive

When action impossible (e.g., cancel completed PO), hide button or disable with tooltip explaining why.

---

## 29. Component System (shadcn/ui)

### 29.1 Installed Components

Use existing project components from `@/components/ui/`:

| Component | Primary use |
|-----------|-------------|
| `Button` | Actions |
| `Input`, `InputGroup`, `Textarea` | Forms, search |
| `Select` | Filters, dropdowns |
| `Table` | All data lists |
| `Card` | Metrics, sections, form wrappers |
| `Dialog` | Modals, confirmations |
| `Sheet` | Mobile nav, filters |
| `DropdownMenu` | Row actions, avatar menu |
| `Badge` | Status, counts |
| `Separator` | Section dividers |
| `Skeleton` | Loading |
| `Tooltip` | Icon-only buttons, truncated text |
| `Alert` | Form-level errors |

### 29.2 Components to Add (Implementation Phases)

| Component | Use |
|-----------|-----|
| `Command` | Global search, product picker |
| `Popover` | Combobox, date presets |
| `AlertDialog` | Destructive confirms |
| `Sonner` / `Toaster` | Toast notifications |
| `Breadcrumb` | Detail navigation |
| `Switch` | Active/inactive toggles |
| `Checkbox` | Multi-select filters |
| `Tabs` | Report views, product detail sections |
| `ScrollArea` | Long dropdowns, POS cart |
| `Avatar` | User menu |
| `Label` | Form accessibility |

### 29.3 Custom Composite Components (To Build)

| Component | Description |
|-----------|-------------|
| `AppShell` | Sidebar + header + main |
| `PageHeader` | Title + breadcrumbs + actions |
| `DataTable` | Table + pagination + sort + empty/loading |
| `SearchInput` | Debounced input with clear |
| `FilterBar` | Composed filters with URL sync |
| `ProductPicker` | Combobox with stock display |
| `LineItemsEditor` | Inline table for PO/sale lines |
| `StockImpactSummary` | Pre-confirm inventory delta list |
| `MetricCard` | Dashboard statistic |
| `EmptyState` | Icon + title + description + CTA |
| `ConfirmDialog` | Standardized confirm pattern |
| `StatusBadge` | Maps entity status → badge variant |
| `MoneyDisplay` | Formatted currency |
| `QtyDisplay` | Signed quantity with color |

### 29.4 Icon Library

**Lucide React** — 16px default, 20px for empty states, stroke width 2.

---

## 30. Screen Specifications

---

### 30.1 Login

**Route:** `/login`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Authenticate users securely |
| **Primary information** | Email, password fields; app branding |
| **Primary actions** | Sign in |
| **Secondary actions** | Forgot password |
| **Key components** | Centered `Card`, `Input`, `Button`, logo |

**Layout:** Split optional — left brand panel (hidden on mobile), right form. MVP: centered card on neutral background.

**User flow:** Enter credentials → submit → redirect to `/dashboard` or intended URL.

**Empty state:** N/A.

**Error state:** Invalid credentials → inline alert above form ("Invalid email or password").

**Responsive:** Full-width card on mobile with `max-w-sm mx-auto`.

---

### 30.2 Dashboard

**Route:** `/dashboard`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Operational overview at a glance |
| **Primary information** | Metrics, low-stock alert, recent sales, recent movements |
| **Primary actions** | New Sale (header); quick action buttons |
| **Secondary actions** | Links to reports, low-stock list, individual records |
| **Key components** | `MetricCard`, `Table` (compact), alert banner, `Button` group |

**User flow:** Land → scan metrics → act on alert or quick action.

**Empty state (new org):** Welcome message + setup checklist (Create product → Add stock → First sale).

**Error state:** Metric skeleton failure → partial render with retry per widget.

**Responsive:** Metrics 2-col tablet, 1-col mobile; tables stack vertically.

---

### 30.3 Products (List)

**Route:** `/products`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Browse, search, and manage product catalog |
| **Primary information** | Product name, category, variant count, total stock, status |
| **Primary actions** | New Product (admin) |
| **Secondary actions** | Export (future), filter, row → detail |
| **Key components** | `DataTable`, `SearchInput`, `FilterBar`, `StatusBadge` |

**User flow:** Search/filter → click row → product detail.

**Empty state:** "No products yet" + Create Product CTA.

**Error state:** Table error with retry.

**Responsive:** Hide category column on `< md`.

---

### 30.4 Product Detail

**Route:** `/products/[id]`

| Aspect | Detail |
|--------|--------|
| **Purpose** | View product info, variants, stock, recent activity |
| **Primary information** | Product header, variant table with SKU/stock/price, movement snippet |
| **Primary actions** | Edit (admin), New Sale (pre-filter variant — future) |
| **Secondary actions** | Archive, view all movements, adjust stock |
| **Key components** | `Tabs` (Overview, Variants, Movements), `Table`, `Badge` |

**User flow:** Review variants → click variant → stock detail or movement history.

**Empty state:** Product with no variants should not exist; show setup prompt.

**Error state:** Product not found → 404 page.

**Responsive:** Variant table horizontal scroll; tabs become select on mobile.

---

### 30.5 Create Product

**Route:** `/products/new`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Add product with variants to catalog |
| **Primary information** | Product fields + variant editor |
| **Primary actions** | Save product |
| **Secondary actions** | Cancel → back to list |
| **Key components** | Form sections, `LineItemsEditor` for variants, `Select` category |

**User flow:** Fill details → add variants → save → redirect to detail.

**Empty state:** Variant table starts with one empty default row.

**Error state:** SKU duplicate → inline error on variant row.

**Responsive:** Single column form; variant table scrolls horizontally.

---

### 30.6 Edit Product

**Route:** `/products/[id]/edit`

Same as Create Product, pre-filled. Archive action in header dropdown (destructive confirm).

---

### 30.7 Categories

**Route:** `/categories`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Manage category hierarchy |
| **Primary information** | Category tree/list with name, product count, status |
| **Primary actions** | New Category |
| **Secondary actions** | Edit, archive, reorder (drag — future; MVP: sort order field) |
| **Key components** | Tree list or indented `Table`, `Dialog` for create/edit |

**User flow:** View tree → create/edit in dialog → save.

**Empty state:** "No categories" + Create Category.

**Error state:** Duplicate name under same parent → inline error.

**Responsive:** Flat list with indent indicators on mobile instead of tree drag.

---

### 30.8 Inventory Overview

**Route:** `/inventory`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Current stock levels across variants |
| **Primary information** | Product, variant, SKU, qty on hand, reorder point, status |
| **Primary actions** | Adjust stock (admin), Record initial stock |
| **Secondary actions** | Filter low stock, export, row → movements |
| **Key components** | `DataTable`, stock color indicators, `FilterBar` |

**User flow:** Filter low stock → identify item → adjust or create PO.

**Empty state:** "No inventory recorded" + Record initial stock.

**Error state:** Standard table error.

**Responsive:** Priority columns: Product, Qty, Status.

---

### 30.9 Inventory Movements

**Route:** `/inventory/movements`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Audit trail of all stock changes |
| **Primary information** | Date, type, product/variant, qty (+/−), user, reference doc |
| **Primary actions** | Export CSV |
| **Secondary actions** | Filter by type/date/product; click reference → source doc |
| **Key components** | `DataTable`, type badges, date range filter |

**User flow:** Filter → find movement → navigate to sale/PO/adjustment reference.

**Empty state:** "No movements yet."

**Error state:** Export failure toast.

**Responsive:** Reference column hidden on mobile; tap row for detail sheet.

---

### 30.10 Stock Adjustments

**Route:** `/inventory/adjustments`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Create and review manual stock corrections |
| **Primary information** | Adjustment history table + create form |
| **Primary actions** | New Adjustment (opens dialog) |
| **Secondary actions** | View linked movement |
| **Key components** | `Dialog`, `ProductPicker`, reason `Textarea`, signed qty input |

**Dialog fields:** Product/variant, warehouse, quantity (+/−), reason (required).

**User flow:** New Adjustment → pick product → enter qty/reason → confirm with stock impact → toast success.

**Empty state:** History empty + prompt to create first adjustment.

**Error state:** Would cause negative stock → inline error with current qty.

**Responsive:** Full-screen dialog on mobile.

---

### 30.11 Damaged / Lost Stock

**Route:** `/inventory/damaged-lost`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Record shrinkage with mandatory accountability |
| **Primary information** | Form + history table filtered to damage/loss types |
| **Primary actions** | Record Damage, Record Loss |
| **Secondary actions** | View movement detail |
| **Key components** | `Tabs` (Damage | Loss), shared form pattern, `Textarea` notes required |

**User flow:** Select type → product → qty → notes → confirm deduction.

**Empty state:** History empty.

**Error state:** Insufficient stock → inline error.

**Responsive:** Same as adjustments.

---

### 30.12 Purchases (PO List)

**Route:** `/purchases`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Track purchase orders and receiving status |
| **Primary information** | PO #, supplier, date, status, total, items count |
| **Primary actions** | Create PO |
| **Secondary actions** | Filter by status/supplier |
| **Key components** | `DataTable`, status badges |

**User flow:** List → open PO → receive or edit draft.

**Empty state:** "No purchase orders" + Create PO.

**Error state:** Standard.

**Responsive:** Hide total on small screens.

---

### 30.13 Purchase Detail & Receiving

**Route:** `/purchases/[id]`

| Aspect | Detail |
|--------|--------|
| **Purpose** | View PO; receive goods against lines |
| **Primary information** | Header (supplier, status, warehouse), line items with ordered/received/remaining |
| **Primary actions** | Receive Goods (when ordered/partial) |
| **Secondary actions** | Mark as ordered, cancel (draft), print |
| **Key components** | `Table`, Receive `Dialog`, receipt history section |

**Receive dialog:** Per-line received qty inputs (default remaining), unit cost confirmation.

**User flow:** Open PO → Receive → enter quantities → confirm with stock impact → status updates.

**Empty state:** Draft PO with no lines → prompt add lines.

**Error state:** Over-receive blocked per line.

**Responsive:** Receive dialog full-screen mobile.

---

### 30.14 Suppliers

**Route:** `/suppliers`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Manage supplier directory |
| **Primary information** | Name, contact, phone, status, PO count |
| **Primary actions** | New Supplier |
| **Secondary actions** | Edit, archive, view POs |
| **Key components** | `DataTable`, create/edit `Dialog` or page |

**User flow:** CRUD suppliers; link to POs filtered by supplier.

**Empty state:** "No suppliers" + New Supplier.

**Error state:** Standard form validation.

**Responsive:** Standard list patterns.

---

### 30.15 Sales (List)

**Route:** `/sales`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Browse sales history |
| **Primary information** | Sale #, date, customer, total, status |
| **Primary actions** | New Sale |
| **Secondary actions** | Filter date/status/customer, export |
| **Key components** | `DataTable`, date range filter |

**User flow:** Find sale → detail → return if needed.

**Empty state:** "No sales found" + New Sale.

**Error state:** Standard.

**Responsive:** Hide customer on narrow; show in row expansion sheet.

---

### 30.16 New Sale (POS)

**Route:** `/sales/new`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Fast sale creation for daily checkout |
| **Primary information** | Product search, line items (qty, price, subtotal), running total, customer |
| **Primary actions** | Complete Sale |
| **Secondary actions** | Save draft, add customer, apply discount, clear cart |
| **Key components** | Split layout, `ProductPicker`, `LineItemsEditor`, sticky total bar |

**Layout (desktop):**

```
┌─────────────────────────────┬──────────────────┐
│  Product search / scan       │  Cart            │
│  Search results grid       │  Line items      │
│                             │  Customer select │
│                             │  ─────────────── │
│                             │  Subtotal        │
│                             │  Discount        │
│                             │  Total           │
│                             │  [Complete Sale] │
└─────────────────────────────┴──────────────────┘
```

**Keyboard:** `/` focus search; Enter add selected; Cmd+Enter complete (with confirm).

**User flow:** Search/scan → add lines → optional customer → Complete → confirm stock impact → receipt/detail.

**Empty state:** Empty cart with search prompt ("Search or scan barcode to add products").

**Error state:** Insufficient stock on line → highlight row, block complete.

**Responsive:** Stack cart below search on tablet; sticky complete bar at bottom.

---

### 30.17 Sale Detail

**Route:** `/sales/[id]`

| Aspect | Detail |
|--------|--------|
| **Purpose** | View completed sale; initiate return |
| **Primary information** | Sale header, line items with snapshot prices, payment total, movements link |
| **Primary actions** | Process Return (if completed) |
| **Secondary actions** | Print receipt, cancel (draft only) |
| **Key components** | Receipt-style `Card`, `Table`, `Button` |

**User flow:** View receipt → return → partial/full return flow.

**Empty state:** N/A for valid ID.

**Error state:** 404 if not found.

**Responsive:** Receipt formatted for print; narrow column layout.

---

### 30.18 Returns

**Route:** `/sales/[id]/return`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Reverse part of a sale with correct stock routing |
| **Primary information** | Original sale lines with returnable qty, restockable toggle |
| **Primary actions** | Process Return |
| **Secondary actions** | Cancel |
| **Key components** | `Table` with qty inputs, `Switch` restockable, `StockImpactSummary` |

**User flow:** Select items/qty → mark damaged vs restockable → confirm → inventory updated.

**Empty state:** All items fully returned → message + back link.

**Error state:** Exceeds returnable qty → inline.

**Responsive:** Single column.

---

### 30.19 Customers

**Route:** `/customers`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Customer directory for sales |
| **Primary information** | Name, contact, total purchases (future), last sale date |
| **Primary actions** | Add Customer |
| **Secondary actions** | Edit, view sales history |
| **Key components** | `DataTable`, quick-add `Dialog` |

**User flow:** CRUD customers; link to filtered sales.

**Empty state:** "No customers" + Add Customer.

**Error state:** Standard.

**Responsive:** Standard.

---

### 30.20 Users

**Route:** `/users`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Admin user management |
| **Primary information** | Name, email, role, status, last active |
| **Primary actions** | Invite User |
| **Secondary actions** | Edit role, deactivate |
| **Key components** | `DataTable`, invite `Dialog`, role `Select` |

**User flow:** Invite → user activates → assign role.

**Empty state:** Only current admin → prompt invite.

**Error state:** Cannot deactivate last admin → error dialog.

**Responsive:** Standard; admin-only.

---

### 30.21 Roles and Permissions

**Route:** `/settings/roles` (future) — MVP: role on user form only

| Aspect | Detail |
|--------|--------|
| **Purpose** | Configure access control |
| **Primary information (MVP)** | Role select on user: Admin / Employee |
| **Primary information (future)** | Permission matrix by resource |
| **Primary actions** | Save role assignment |
| **Key components** | `Select`, future: permission grid |

**MVP UX:** Role is a field on Users, not a separate screen. Settings shows read-only role descriptions.

**Future:** Dedicated matrix UI with grouped permissions.

---

### 30.22 Reports

**Route:** `/reports`, `/reports/[slug]`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Business insights and exports |
| **Primary information** | Report hub cards; individual report tables/charts |
| **Primary actions** | Run report, Export CSV |
| **Secondary actions** | Date range, filters |
| **Key components** | Report cards, `DataTable`, date picker |

**Reports (MVP):** Inventory valuation, Low stock, Sales summary, Purchase summary, Movement export.

**User flow:** Hub → select report → set dates → view → export.

**Empty state:** No data in range → "No data for selected period."

**Error state:** Export failure toast.

**Responsive:** Tables scroll; charts stack.

---

### 30.23 Low-Stock Alerts

**Route:** `/alerts/low-stock`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Actionable list of items needing replenishment |
| **Primary information** | Product, variant, current qty, reorder point, deficit |
| **Primary actions** | Create PO (pre-filled — future), view product |
| **Secondary actions** | Export, filter by category |
| **Key components** | `DataTable`, amber row highlighting, link to product |

**User flow:** Review list → create PO or adjust reorder point (admin).

**Empty state:** Positive — "All stock levels healthy" with check icon.

**Error state:** Standard.

**Responsive:** Standard priority columns.

---

### 30.24 Settings

**Route:** `/settings`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Organization and system configuration |
| **Primary information** | Org name, timezone, currency, warehouse defaults, API keys |
| **Primary actions** | Save settings |
| **Secondary actions** | Manage warehouses, API keys, profile link |
| **Key components** | `Tabs`: General | Warehouses | Integrations | Profile |

**Sections:**

- **General:** Org name, timezone, currency.
- **Warehouses:** Default warehouse, warehouse list (admin).
- **Integrations:** API keys for n8n (admin).
- **Profile:** Link to `/settings/profile` for all users.

**User flow:** Admin updates org settings → save → toast.

**Empty state:** N/A.

**Error state:** Validation on required fields.

**Responsive:** Tabs → select on mobile.

---

## 31. Critical Workflow Diagrams

### 31.1 Find Product & Check Stock

```
Global Search (⌘K) ──▶ Select product ──▶ Product Detail
                                              │
Inventory Overview ──▶ Filter/search ─────────┘
                              │
                              ▼
                        Variant stock qty + status
```

**Target:** 2 keystrokes + enter with global search.

### 31.2 Make a Sale

```
Header [New Sale] ──▶ POS: search/scan ──▶ Add lines ──▶ Complete
                                                    │
                                                    ▼
                                          Stock impact confirm
                                                    │
                                                    ▼
                                          Sale Detail (receipt)
```

**Target:** 1 click from anywhere to POS.

### 31.3 Receive Inventory

```
Purchases ──▶ Open PO ──▶ [Receive Goods] ──▶ Enter qty ──▶ Confirm
                                                                │
                                                                ▼
                                                    Movements + balance updated
```

### 31.4 Adjust Inventory

```
Inventory ──▶ [Adjust Stock] ──▶ Dialog: product, qty, reason ──▶ Confirm
```

### 31.5 View Movement History

```
Inventory / Product Detail ──▶ Movements tab ──▶ Filter ──▶ Click reference
```

---

## 32. Theme and Dark Mode

### 32.1 MVP

- **Light mode only** for MVP — matches professional business default.
- CSS variables in `globals.css` already support dark mode; enable in Phase 2+ via user setting.

### 32.2 Color Tokens

Use shadcn semantic tokens — no hardcoded hex in components except stock status amber.

| Token | Usage |
|-------|-------|
| `--primary` | Primary actions, active nav |
| `--destructive` | Errors, out of stock, destructive buttons |
| `--muted` | Backgrounds, disabled, secondary text |
| `--border` | Dividers, table borders |
| `--sidebar-*` | Sidebar-specific |

### 32.3 Radius

`--radius: 0.625rem` — consistent rounded corners on cards, inputs, buttons.

---

## 33. Print Styles

### 33.1 Printable Views

- Sale receipt / sale detail
- PO document (future)
- Report export prefers CSV; print is secondary

### 33.2 Print Rules

- Hide sidebar, header, actions.
- Black on white; badges become text labels.
- `@media print` stylesheet in layout.

---

## 34. Implementation Checklist (For Developers)

When implementing each screen, verify:

- [ ] Page title and primary action in `PageHeader`
- [ ] Loading skeleton matches layout
- [ ] Empty state with role-appropriate CTA
- [ ] Error state with retry or inline fix
- [ ] Search/filters sync to URL
- [ ] Table uses compact density
- [ ] Status uses `StatusBadge` component
- [ ] Inventory mutations show stock impact before confirm
- [ ] Toast on success
- [ ] Keyboard accessible
- [ ] Responsive spot-check at 768px and 1280px

---

## 35. Related Documents

- `/docs/requirements.md` — functional and business rules
- `/docs/architecture.md` — technical architecture and modules
- `/docs/roadmap.md` — phased implementation order
- `/docs/database.md` — schema (to be populated)
- `/docs/automations.md` — n8n workflow UX (to be populated)

This document is the **source of truth for UX/UI decisions**. Implementation must follow these patterns unless a deviation is documented and justified.
