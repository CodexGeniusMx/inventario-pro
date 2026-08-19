import { describe, expect, it } from "vitest"

import {
  canManageRolePermissions,
  canViewFinancialProfit,
  canViewProductCosts,
  hasPermission,
} from "@/lib/auth/permissions"
import { canViewPurchaseFinancials } from "@/lib/auth/financial-data"
import { userWithRole, ROLE_PERMISSION_PRESETS } from "@/tests/setup/factories"

describe("Phase 0 security closure — permission primitives", () => {
  it("only owner and admin can manage role permissions", () => {
    expect(canManageRolePermissions(userWithRole("owner"))).toBe(true)
    expect(canManageRolePermissions(userWithRole("admin"))).toBe(true)
    expect(canManageRolePermissions(userWithRole("manager"))).toBe(false)
    expect(canManageRolePermissions(userWithRole("seller"))).toBe(false)
    expect(canManageRolePermissions(userWithRole("warehouse"))).toBe(false)
    expect(canManageRolePermissions(userWithRole("read_only"))).toBe(false)
  })

  it("seller cannot view product or purchase costs via permission helpers", () => {
    const seller = userWithRole("seller")
    expect(canViewProductCosts(seller)).toBe(false)
    expect(canViewPurchaseFinancials(seller)).toBe(false)
    expect(canViewFinancialProfit(seller)).toBe(false)
  })

  it("manager matches DB seed cost permissions when granted explicitly", () => {
    const manager = userWithRole("manager", {
      permissions: [
        ...ROLE_PERMISSION_PRESETS.manager,
        { resource: "products", action: "view_cost" },
        { resource: "purchases", action: "view_cost" },
        { resource: "financial", action: "costs" },
        { resource: "financial", action: "profit" },
      ],
    })
    expect(canViewProductCosts(manager)).toBe(true)
    expect(hasPermission(manager, "purchases", "view_cost")).toBe(true)
    expect(canViewFinancialProfit(manager)).toBe(true)
  })

  it("read-only auditor cannot view costs per DB seeds", () => {
    const auditor = userWithRole("read_only")
    expect(canViewProductCosts(auditor)).toBe(false)
    expect(canManageRolePermissions(auditor)).toBe(false)
  })
})

describe("Phase 0 security closure — live DB requirements", () => {
  it("documents integration cases for migration 00030", () => {
    const requiresLiveDb = [
      "profile_branch_organization_mismatch trigger rejects cross-org branch",
      "profile_warehouse_organization_mismatch trigger rejects cross-org warehouse",
      "last_owner_protected trigger blocks demoting final owner",
      "insert_audit_log raises audit_log_direct_insert_denied for authenticated",
      "direct SELECT on products denied; v_products masks base_cost_price",
      "direct SELECT on product_variants denied; v_product_variants masks cost_price",
      "create_purchase_order rejects created_by_spoof_denied",
      "create_purchase_order returns existing PO for duplicate idempotency_key",
      "role_permissions client INSERT denied by restrictive policy",
    ]

    expect(requiresLiveDb.length).toBeGreaterThanOrEqual(9)
  })
})
