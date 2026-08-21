# Phase 1A — Personal Settings + Role Permission Editor

**Date:** 2026-08-20  
**Status:** Implemented in codebase — **awaiting migration `00032` apply + live Supabase QA**

---

## Summary

Phase 1A delivers two **separate** systems:

1. **Personal settings (`/account/*`)** — available to every authenticated user  
2. **Organization role permission editor (`/settings/permissions/*`)** — Owner/Admin only via `roles:manage_permissions`

Phase 0 security controls were preserved. No base-table SELECT grants, no RLS weakening, no Keep AI mutation tools added.

---

## Architecture before

| Area | Before |
|------|--------|
| User preferences | None — theme/density/accessibility not persisted |
| Permission matrix | Global `role_permissions` seeds only; client writes denied (`00030`) |
| Effective permissions | `has_permission()` + session join on global `role_permissions` |
| Settings UX | Single `/settings` org page; user menu stubs |
| Permission editor | Deferred from Phase 0 |

---

## Personal settings architecture

### Storage

Migration `00032` adds `user_preferences`:

| Column | Purpose |
|--------|---------|
| `theme` | `light` / `dark` / `system` (default `system`) |
| `density` | `compact` / `normal` / `comfortable` |
| `text_size` | `normal` / `large` |
| `reduce_motion` | boolean |
| `high_contrast` | boolean |
| `notifications_in_app` | boolean (functional foundation) |
| `notifications_email_enabled` | placeholder (no delivery yet) |
| `notifications_whatsapp_enabled` | placeholder (no delivery yet) |

### Security

- RLS: users may SELECT/INSERT/UPDATE **only their own row** (`user_id = auth.uid()`)
- Trigger validates `organization_id` matches profile
- RPCs: `get_or_create_user_preferences()`, `upsert_user_preferences()` (SECURITY DEFINER)

### UI routes

| Route | Section |
|-------|---------|
| `/account/profile` | Mi perfil |
| `/account/appearance` | Tema + densidad |
| `/account/accessibility` | Texto, movimiento, contraste, densidad |
| `/account/notifications` | In-app + placeholders |
| `/account/security` | Información / Próximamente (2FA, sesiones) |

### Theme implementation

- No new npm dependency — cookie + inline boot script + `PreferencesProvider`
- Cookie `keep-prefs` prevents flash; DB is source of truth per user
- CSS tokens in `globals.css`; density affects tables/cards via `data-density` on `<html>`

---

## Organization permission override model

### New table: `organization_role_permission_overrides`

| Column | Purpose |
|--------|---------|
| `organization_id` | Tenant scope |
| `role` | `app_role` |
| `permission_id` | FK → `permissions` |
| `granted` | explicit allow (`true`) or deny (`false`) |

Global `role_permissions` remains the **default catalog** for all organizations.

### Effective permission resolution

```
effective =
  organization_role_permission_overrides.granted   IF override row exists
  ELSE role_permissions default for role
```

Implemented in SQL:

- `effective_role_permission_granted(org, role, permission_id)`
- Updated `has_permission(resource, action)` — used by RLS/RPCs
- `get_my_effective_permissions()` — session loading
- `get_effective_permissions_for_role(org, role)` — editor UI

App layer `hasPermission()` still applies Owner/Admin bypass; non-admin users use effective permissions from session RPC.

### Mutation path (secure)

Direct client INSERT/UPDATE/DELETE on overrides: **denied**

RPCs (SECURITY DEFINER):

- `update_organization_role_permissions(role, changes jsonb)` — requires `can_manage_role_permissions()`
- `restore_organization_role_permissions(role)` — removes org overrides for role

### Owner / Admin safety

- **Owner role:** immutable in editor (`owner_role_immutable`)
- **Admin role:** `roles:manage_permissions` cannot be revoked while granted (protected in RPC + UI)
- Phase 0 `protect_last_owner` trigger unchanged

### Audit

Bulk permission saves emit one `audit_log_record` per RPC call:

- Action: `role_permission.update` or `role_permission.restore_defaults`
- Entity: `role_permission`
- Source: `ui`

---

## Permission groups (UI)

Reuses existing seeded permissions from `00013` / `00027` / `00030`. UI catalog in `lib/permissions/catalog.ts` maps to Spanish labels — no duplicate permission universe.

Keep AI continues inheriting business capabilities via `hasPermission()` / `canViewProductCosts()` on effective session permissions.

---

## Navigation behavior

| Role | Personal settings | Org settings | Permission editor |
|------|-------------------|--------------|-------------------|
| Owner | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| Manager | ✅ | If `settings:*` granted | ❌ |
| Seller | ✅ | ❌ | ❌ |
| Warehouse | ✅ | ❌ | ❌ |
| Read-only | ✅ | If `settings:read` | ❌ |

Route guards:

- `/account/*` → `requireUserOrRedirect`
- `/settings/*` → `requireSettingsAccessOrRedirect`
- `/settings/permissions/*` → `requireRolePermissionsAccessOrRedirect`

---

## Tests

| Suite | Location | Type |
|-------|----------|------|
| Personal prefs + editor access + protected perms | `tests/phase-1a/personal-settings-permissions.test.ts` | Unit |
| Phase 0 primitives | existing security tests | Unit |
| Live DB matrix / RLS / multi-tenant | documented in test file | **Integration required** |

---

## Remaining live QA

1. Apply `00032` after `00031`
2. Seller opens `/account/appearance` — OK; `/settings` redirects
3. Org A grants Seller `products:edit`; Org B Seller unchanged
4. Restore defaults removes overrides only for caller org
5. Direct PostgREST write to `organization_role_permission_overrides` → denied
6. Permission change appears in `audit_logs`
7. Keep AI cost tools follow org override for Seller when granted

---

## Future custom roles

Schema uses `app_role` enum + org overrides today. Future path:

1. Add `organization_roles` table (custom role definitions)
2. Map profiles to org role id OR system role
3. Extend override table to reference org role id
4. Do **not** mutate global seeds for one tenant

---

## Files changed (implementation)

See final delivery report in conversation / git diff.

**Migration:** `supabase/migrations/00032_user_preferences_and_role_permission_editor.sql`

**SAFE TO APPLY 00032:** YES (after `00031`; does not weaken Phase 0)
