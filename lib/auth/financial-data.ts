import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  canViewFinancialProfit,
  canViewFinancialRevenue,
  canViewProductCosts,
  hasPermission,
} from "@/lib/auth/permissions"
import type {
  InventoryReportRow,
  SalesReportSummary,
} from "@/types/reports"

export function canViewReportRevenue(user: AuthenticatedUser): boolean {
  return (
    canViewFinancialRevenue(user) || hasPermission(user, "reports", "read")
  )
}

export function canViewReportProfit(user: AuthenticatedUser): boolean {
  return canViewFinancialProfit(user)
}

export function canViewReportInventoryValue(user: AuthenticatedUser): boolean {
  return canViewProductCosts(user)
}

export function canViewPurchaseFinancials(user: AuthenticatedUser): boolean {
  return canViewProductCosts(user)
}

export function stripSalesReportSummary(
  summary: SalesReportSummary,
  user: AuthenticatedUser
): SalesReportSummary {
  if (canViewReportProfit(user)) {
    return summary
  }

  return {
    ...summary,
    estimatedCogs: 0,
    estimatedGrossProfit: 0,
  }
}

export function stripInventoryReportRows(
  rows: InventoryReportRow[],
  user: AuthenticatedUser
): InventoryReportRow[] {
  if (canViewReportInventoryValue(user)) {
    return rows
  }

  return rows.map((row) => ({
    ...row,
    unitCost: 0,
    inventoryValue: 0,
  }))
}

export function stripPurchaseOrderCosts<
  T extends {
    subtotal?: number
    total?: number
    lines?: Array<{ unitCost?: number; lineTotal?: number }>
    receipts?: Array<{
      items?: Array<{ unitCost?: number }>
    }>
  },
>(detail: T, user: AuthenticatedUser): T {
  if (canViewPurchaseFinancials(user)) {
    return detail
  }

  return {
    ...detail,
    subtotal: undefined,
    total: undefined,
    lines: detail.lines?.map((line) => ({
      ...line,
      unitCost: undefined,
      lineTotal: undefined,
    })),
    receipts: detail.receipts?.map((receipt) => ({
      ...receipt,
      items: receipt.items?.map((item) => ({
        ...item,
        unitCost: undefined,
      })),
    })),
  }
}
