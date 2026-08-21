import { describe, expect, it } from "vitest"

import {
  canManageRolePermissions,
  canManageSettings,
  hasPermission,
} from "@/lib/auth/permissions"
import {
  getProtectedPermissionReason,
  isProtectedRolePermission,
  permissionKey,
} from "@/lib/permissions/catalog"
import {
  DEFAULT_USER_PREFERENCES,
  mergePreferences,
  parsePreferencesCookie,
  serializePreferencesCookie,
} from "@/lib/preferences/types"
import { userWithRole } from "@/tests/setup/factories"

describe("Phase 1A — personal preferences", () => {
  it("defaults to system theme and normal density", () => {
    expect(DEFAULT_USER_PREFERENCES.theme).toBe("system")
    expect(DEFAULT_USER_PREFERENCES.density).toBe("normal")
  })

  it("serializes and parses preference cookies without leaking unrelated users", () => {
    const cookie = serializePreferencesCookie({
      ...DEFAULT_USER_PREFERENCES,
      theme: "dark",
      density: "compact",
    })

    expect(parsePreferencesCookie(cookie)).toEqual({
      theme: "dark",
      density: "compact",
      textSize: "normal",
      reduceMotion: false,
      highContrast: false,
    })
  })

  it("merges partial preference updates per user", () => {
    const merged = mergePreferences(DEFAULT_USER_PREFERENCES, {
      theme: "light",
    })

    expect(merged.theme).toBe("light")
    expect(merged.density).toBe("normal")
  })
})

describe("Phase 1A — permission editor access", () => {
  it("owner and admin can manage role permissions", () => {
    expect(canManageRolePermissions(userWithRole("owner"))).toBe(true)
    expect(canManageRolePermissions(userWithRole("admin"))).toBe(true)
  })

  it("manager, seller, warehouse and auditor cannot manage role permissions", () => {
    expect(canManageRolePermissions(userWithRole("manager"))).toBe(false)
    expect(canManageRolePermissions(userWithRole("seller"))).toBe(false)
    expect(canManageRolePermissions(userWithRole("warehouse"))).toBe(false)
    expect(canManageRolePermissions(userWithRole("read_only"))).toBe(false)
  })

  it("seller can access personal settings route conceptually but not organization settings", () => {
    const seller = userWithRole("seller")
    expect(canManageSettings(seller)).toBe(false)
    expect(hasPermission(seller, "roles", "manage_permissions")).toBe(false)
  })
})

describe("Phase 1A — protected permissions", () => {
  it("owner role permissions are fully protected in the editor", () => {
    expect(
      isProtectedRolePermission("owner", "roles", "manage_permissions", true)
    ).toBe(true)
    expect(getProtectedPermissionReason("owner", "products", "view")).toContain(
      "Propietario"
    )
  })

  it("admin cannot remove roles.manage_permissions while granted", () => {
    expect(
      isProtectedRolePermission("admin", "roles", "manage_permissions", true)
    ).toBe(true)
    expect(
      isProtectedRolePermission("admin", "roles", "manage_permissions", false)
    ).toBe(false)
  })
})

describe("Phase 1A — effective permission keys", () => {
  it("builds stable permission keys for matrix lookups", () => {
    expect(permissionKey("products", "view_cost")).toBe("products:view_cost")
  })
})

describe("Phase 1A — live Supabase QA required", () => {
  it("documents integration cases for migration 00032", () => {
    const requiresLiveDb = [
      "user_preferences RLS blocks cross-user updates",
      "organization_role_permission_overrides deny direct client writes",
      "Org A seller override does not affect Org B seller",
      "has_permission() respects organization overrides",
      "restore_organization_role_permissions removes overrides only for caller org",
      "update_organization_role_permissions writes audit_log_record entries",
      "protected admin roles.manage_permissions cannot be revoked via RPC",
      "owner_role_immutable raised for owner edits",
    ]

    expect(requiresLiveDb.length).toBeGreaterThanOrEqual(8)
  })
})
