import { describe, expect, it } from "vitest"

import {
  canManageRolePermissions,
  canManageSettings,
  canManageUsers,
  canViewFinancialProfit,
  canViewProductCosts,
  hasPermission,
} from "@/lib/auth/permissions"
import { userWithRole } from "@/tests/setup/factories"

describe("role permission presets", () => {
  it("vendedor can view stock and create sales", () => {
    const seller = userWithRole("seller")
    expect(hasPermission(seller, "inventory", "view")).toBe(true)
    expect(hasPermission(seller, "sales", "create")).toBe(true)
  })

  it("vendedor cannot view costs, profit, currency settings, users, or permission matrix", () => {
    const seller = userWithRole("seller")
    expect(canViewProductCosts(seller)).toBe(false)
    expect(canViewFinancialProfit(seller)).toBe(false)
    expect(canManageSettings(seller)).toBe(false)
    expect(canManageUsers(seller)).toBe(false)
    expect(canManageRolePermissions(seller)).toBe(false)
  })

  it("almacén can receive purchases and view inventory", () => {
    const warehouse = userWithRole("warehouse")
    expect(hasPermission(warehouse, "inventory", "view")).toBe(true)
    expect(hasPermission(warehouse, "purchases", "receive")).toBe(true)
  })

  it("almacén cannot see profit or manage users", () => {
    const warehouse = userWithRole("warehouse")
    expect(canViewFinancialProfit(warehouse)).toBe(false)
    expect(canManageUsers(warehouse)).toBe(false)
    expect(canManageSettings(warehouse)).toBe(false)
  })

  it("solo lectura has view-only permissions", () => {
    const readOnly = userWithRole("read_only")
    expect(hasPermission(readOnly, "products", "view")).toBe(true)
    expect(hasPermission(readOnly, "sales", "create")).toBe(false)
    expect(hasPermission(readOnly, "inventory", "adjust")).toBe(false)
  })

  it("propietario has broad access via permissions", () => {
    const owner = userWithRole("owner")
    expect(canViewFinancialProfit(owner)).toBe(true)
    expect(canManageUsers(owner)).toBe(true)
    expect(canManageRolePermissions(owner)).toBe(true)
    expect(hasPermission(owner, "settings", "currency")).toBe(true)
  })
})
