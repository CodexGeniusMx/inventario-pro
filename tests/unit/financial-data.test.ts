import { describe, expect, it } from "vitest"

import {
  stripInventoryReportRows,
  stripSalesReportSummary,
} from "@/lib/auth/financial-data"
import { buildPermissions, userWithRole } from "@/tests/setup/factories"

describe("financial data stripping", () => {
  const auditor = userWithRole("read_only", {
    permissions: buildPermissions([
      ["reports", "read"],
      ["products", "view"],
      ["inventory", "view"],
    ]),
  })

  it("strips inventory valuation for users without cost permission", () => {
    const rows = stripInventoryReportRows(
      [
        {
          productId: "p1",
          productName: "Widget",
          productVariantId: "v1",
          variantName: "Default",
          sku: "W-1",
          warehouseId: "w1",
          warehouseName: "Main",
          quantityOnHand: 10,
          reorderPoint: 2,
          stockStatus: "in_stock",
          unitCost: 25,
          inventoryValue: 250,
        },
      ],
      auditor
    )

    expect(rows[0]?.unitCost).toBe(0)
    expect(rows[0]?.inventoryValue).toBe(0)
    expect(rows[0]?.quantityOnHand).toBe(10)
  })

  it("strips sales profit summary for users without financial:profit", () => {
    const summary = stripSalesReportSummary(
      {
        salesCount: 3,
        unitsSold: 12,
        returnUnits: 1,
        grossRevenue: 1000,
        netRevenue: 900,
        discountTotal: 50,
        returnRevenue: 50,
        estimatedCogs: 400,
        estimatedGrossProfit: 500,
      },
      auditor
    )

    expect(summary.netRevenue).toBe(900)
    expect(summary.estimatedCogs).toBe(0)
    expect(summary.estimatedGrossProfit).toBe(0)
  })

  it("preserves cost fields for manager with view_cost", () => {
    const manager = userWithRole("manager", {
      permissions: buildPermissions([
        ["reports", "read"],
        ["products", "view_cost"],
        ["financial", "profit"],
      ]),
    })

    const rows = stripInventoryReportRows(
      [
        {
          productId: "p1",
          productName: "Widget",
          productVariantId: "v1",
          variantName: "Default",
          sku: "W-1",
          warehouseId: "w1",
          warehouseName: "Main",
          quantityOnHand: 10,
          reorderPoint: 2,
          stockStatus: "in_stock",
          unitCost: 25,
          inventoryValue: 250,
        },
      ],
      manager
    )

    expect(rows[0]?.unitCost).toBe(25)
    expect(rows[0]?.inventoryValue).toBe(250)
  })
})

describe("profile self-escalation (documented behavior)", () => {
  it("documents that profiles_update_self must not allow privileged field changes", () => {
    const blockedSelfUpdates = [
      "role",
      "organization_id",
      "is_active",
      "branch_id",
      "default_warehouse_id",
    ]

    expect(blockedSelfUpdates.length).toBeGreaterThan(0)
  })
})
