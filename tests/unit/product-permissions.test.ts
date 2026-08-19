import { describe, expect, it } from "vitest"

import {
  canArchiveProducts,
  canCreateProducts,
  canEditProducts,
  canViewProductCosts,
  canViewProducts,
} from "@/lib/auth/product-permissions"
import { userWithRole } from "@/tests/setup/factories"

describe("Seller product permissions", () => {
  const seller = userWithRole("seller")

  it("can view products but not mutate catalog", () => {
    expect(canViewProducts(seller)).toBe(true)
    expect(canCreateProducts(seller)).toBe(false)
    expect(canEditProducts(seller)).toBe(false)
    expect(canArchiveProducts(seller)).toBe(false)
  })

  it("cannot view acquisition cost", () => {
    expect(canViewProductCosts(seller)).toBe(false)
  })
})

describe("Admin product permissions", () => {
  const admin = userWithRole("admin")

  it("retains catalog management and cost visibility", () => {
    expect(canViewProducts(admin)).toBe(true)
    expect(canCreateProducts(admin)).toBe(true)
    expect(canEditProducts(admin)).toBe(true)
    expect(canArchiveProducts(admin)).toBe(true)
    expect(canViewProductCosts(admin)).toBe(true)
  })
})

describe("Owner product permissions", () => {
  const owner = userWithRole("owner")

  it("retains full product catalog access", () => {
    expect(canViewProducts(owner)).toBe(true)
    expect(canCreateProducts(owner)).toBe(true)
    expect(canEditProducts(owner)).toBe(true)
    expect(canArchiveProducts(owner)).toBe(true)
    expect(canViewProductCosts(owner)).toBe(true)
  })
})
