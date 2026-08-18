import type { PostgrestError } from "@supabase/supabase-js"

import { hasPermission } from "@/lib/auth/permissions"
import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  formatChartDayLabel,
  percentChange,
  resolveReportDateRange,
} from "@/lib/reports/date-ranges"
import { createClient } from "@/lib/supabase/server"
import type {
  DashboardSummary,
  LowStockProduct,
  RecentInventoryMovement,
  RecentPurchaseActivity,
  RecentReturnActivity,
  RecentSale,
  SalesChartPoint,
  TopProduct,
} from "@/types/dashboard"

type SalesSummaryRow = {
  sales_count: number | null
  units_sold: number | null
  return_units: number | null
  gross_revenue: number | null
  net_revenue: number | null
  discount_total: number | null
  return_revenue: number | null
  estimated_cogs: number | null
  estimated_gross_profit: number | null
}

type SalesByDayRow = {
  day: string
  sales_count: number | null
  net_revenue: number | null
}

type TopProductRow = {
  product_variant_id: string
  product_name: string
  variant_name: string
  sku: string
  units_sold: number | null
  net_revenue: number | null
}

function mapMovementType(value: string): RecentInventoryMovement["type"] {
  const allowed: RecentInventoryMovement["type"][] = [
    "sale",
    "purchase_receipt",
    "adjustment_increase",
    "adjustment_decrease",
    "damage",
    "loss",
    "sale_return",
    "initial_stock",
    "transfer_in",
    "transfer_out",
  ]

  if (allowed.includes(value as RecentInventoryMovement["type"])) {
    return value as RecentInventoryMovement["type"]
  }

  if (value.startsWith("adjustment")) {
    return value.includes("decrease")
      ? "adjustment_decrease"
      : "adjustment_increase"
  }

  return "sale"
}

function mapMovementReference(row: {
  movement_type: string
  sale_id: string | null
  purchase_receipt_id: string | null
  return_id: string | null
  stock_adjustment_id: string | null
  sales?: { document_number: string } | null
  purchase_receipts?: { document_number: string } | null
  returns?: { document_number: string } | null
  stock_adjustments?: { document_number: string } | null
}): string {
  if (row.sales?.document_number) {
    return row.sales.document_number
  }

  if (row.purchase_receipts?.document_number) {
    return row.purchase_receipts.document_number
  }

  if (row.returns?.document_number) {
    return row.returns.document_number
  }

  if (row.stock_adjustments?.document_number) {
    return row.stock_adjustments.document_number
  }

  return "—"
}

async function fetchSalesSummary(
  organizationId: string,
  from: Date,
  to: Date
): Promise<SalesSummaryRow> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("report_sales_summary", {
    p_organization_id: organizationId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  })

  if (error) {
    throw error
  }

  const row = (Array.isArray(data) ? data[0] : data) as SalesSummaryRow | undefined

  return (
    row ?? {
      sales_count: 0,
      units_sold: 0,
      return_units: 0,
      gross_revenue: 0,
      net_revenue: 0,
      discount_total: 0,
      return_revenue: 0,
      estimated_cogs: 0,
      estimated_gross_profit: 0,
    }
  )
}

function buildSalesChart(
  rows: SalesByDayRow[],
  from: Date,
  to: Date
): SalesChartPoint[] {
  const revenueByDay = new Map<string, SalesByDayRow>()

  for (const row of rows) {
    revenueByDay.set(row.day, row)
  }

  const points: SalesChartPoint[] = []
  const cursor = new Date(from)

  while (cursor < to) {
    const key = cursor.toISOString().slice(0, 10)
    const row = revenueByDay.get(key)

    points.push({
      label: formatChartDayLabel(key),
      date: key,
      sales: Number(row?.net_revenue ?? 0),
      salesCount: Number(row?.sales_count ?? 0),
    })

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return points
}

export async function getDashboardSummary(
  user: AuthenticatedUser,
  options: { chartRangeDays?: 7 | 30 } = {}
): Promise<DashboardSummary> {
  const chartRangeDays = options.chartRangeDays ?? 7
  const canViewFinancials = hasPermission(user, "reports", "read")
  const now = new Date()

  const todayRange = resolveReportDateRange({ preset: "today", now })
  const monthRange = resolveReportDateRange({ preset: "this_month", now })
  const yesterdayRange = resolveReportDateRange({
    preset: "custom",
    from: new Date(todayRange.from.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    to: new Date(todayRange.from.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    now,
  })
  const previousMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  )
  const previousMonthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  )
  const chartRange = resolveReportDateRange({
    preset: chartRangeDays === 7 ? "last_7_days" : "last_30_days",
    now,
  })

  const supabase = await createClient()

  const [
    todaySummary,
    yesterdaySummary,
    monthSummary,
    previousMonthSummary,
    valuationRows,
    inventoryStatusRows,
    activeProductsResult,
    recentSalesResult,
    recentMovementsResult,
    topProductsResult,
    salesByDayResult,
    recentPurchasesResult,
    recentReturnsResult,
  ] = await Promise.all([
    canViewFinancials
      ? fetchSalesSummary(user.organizationId, todayRange.from, todayRange.to)
      : Promise.resolve(null),
    canViewFinancials
      ? fetchSalesSummary(
          user.organizationId,
          yesterdayRange.from,
          yesterdayRange.to
        )
      : Promise.resolve(null),
    canViewFinancials
      ? fetchSalesSummary(user.organizationId, monthRange.from, monthRange.to)
      : Promise.resolve(null),
    canViewFinancials
      ? fetchSalesSummary(
          user.organizationId,
          previousMonthStart,
          previousMonthEnd
        )
      : Promise.resolve(null),
    supabase
      .from("v_inventory_valuation")
      .select("quantity_on_hand, inventory_value")
      .eq("organization_id", user.organizationId),
    supabase
      .from("v_inventory_status")
      .select(
        "product_name, variant_name, sku, quantity_on_hand, reorder_point, stock_status, warehouse_name"
      )
      .eq("organization_id", user.organizationId),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", user.organizationId)
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("sales")
      .select(
        `
          id,
          document_number,
          total,
          status,
          completed_at,
          created_at,
          customers ( name ),
          sale_items ( id )
        `
      )
      .eq("organization_id", user.organizationId)
      .in("status", ["completed", "partially_returned", "fully_returned"])
      .order("completed_at", { ascending: false })
      .limit(5),
    supabase
      .from("inventory_movements")
      .select(
        `
          id,
          movement_type,
          quantity,
          created_at,
          sale_id,
          purchase_receipt_id,
          return_id,
          stock_adjustment_id,
          product_variants (
            name,
            sku,
            products ( name )
          ),
          profiles!inventory_movements_created_by_fkey ( full_name ),
          sales ( document_number ),
          purchase_receipts ( document_number ),
          returns ( document_number ),
          stock_adjustments ( document_number )
        `
      )
      .eq("organization_id", user.organizationId)
      .order("created_at", { ascending: false })
      .limit(5),
    canViewFinancials
      ? supabase.rpc("report_top_products", {
          p_organization_id: user.organizationId,
          p_from: chartRange.from.toISOString(),
          p_to: chartRange.to.toISOString(),
          p_limit: 5,
        })
      : Promise.resolve({ data: [], error: null }),
    canViewFinancials
      ? supabase.rpc("report_sales_by_day", {
          p_organization_id: user.organizationId,
          p_from: chartRange.from.toISOString(),
          p_to: chartRange.to.toISOString(),
        })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("purchase_orders")
      .select(
        `
          id,
          document_number,
          status,
          total,
          ordered_at,
          suppliers ( name )
        `
      )
      .eq("organization_id", user.organizationId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("returns")
      .select(
        `
          id,
          document_number,
          reason,
          created_at,
          sales ( document_number ),
          return_items ( quantity )
        `
      )
      .eq("organization_id", user.organizationId)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const errors: PostgrestError[] = [
    valuationRows.error,
    inventoryStatusRows.error,
    activeProductsResult.error,
    recentSalesResult.error,
    recentMovementsResult.error,
    recentPurchasesResult.error,
    recentReturnsResult.error,
    topProductsResult.error,
    salesByDayResult.error,
  ].filter(Boolean) as PostgrestError[]

  if (errors.length > 0) {
    throw errors[0]
  }

  const inventoryValue = (valuationRows.data ?? []).reduce(
    (sum, row) => sum + Number(row.inventory_value ?? 0),
    0
  )
  const totalUnitsInStock = (valuationRows.data ?? []).reduce(
    (sum, row) => sum + Number(row.quantity_on_hand ?? 0),
    0
  )

  const lowStockProducts: LowStockProduct[] = (inventoryStatusRows.data ?? [])
    .filter((row) => row.stock_status === "low_stock")
    .slice(0, 5)
    .map((row) => ({
      product: row.product_name ?? "Unknown product",
      variant: row.variant_name ?? "Default",
      sku: row.sku ?? "—",
      onHand: row.quantity_on_hand ?? 0,
      reorderPoint: row.reorder_point ?? 0,
      warehouseName: row.warehouse_name ?? "Unknown warehouse",
    }))

  const lowStockCount = (inventoryStatusRows.data ?? []).filter(
    (row) => row.stock_status === "low_stock"
  ).length
  const outOfStockCount = (inventoryStatusRows.data ?? []).filter(
    (row) => row.stock_status === "out_of_stock"
  ).length

  const recentSales: RecentSale[] = (recentSalesResult.data ?? []).map((row) => ({
    id: row.id,
    saleNumber: row.document_number,
    customer: row.customers?.name ?? "Walk-in customer",
    total: Number(row.total),
    itemCount: row.sale_items?.length ?? 0,
    status: row.status,
    createdAt: row.completed_at ?? row.created_at,
  }))

  const recentMovements: RecentInventoryMovement[] = (
    recentMovementsResult.data ?? []
  ).map((row) => ({
    id: row.id,
    type: mapMovementType(row.movement_type),
    product: row.product_variants?.products?.name ?? "Unknown product",
    variant: row.product_variants?.name ?? "Default",
    quantity: row.quantity,
    user: row.profiles?.full_name ?? "Unknown user",
    reference: mapMovementReference(row),
    createdAt: row.created_at,
  }))

  const topProducts: TopProduct[] = ((topProductsResult.data ?? []) as TopProductRow[]).map(
    (row, index) => ({
      rank: index + 1,
      product: row.product_name,
      variant: row.variant_name,
      sku: row.sku,
      unitsSold: Number(row.units_sold ?? 0),
      revenue: Number(row.net_revenue ?? 0),
    })
  )

  const salesChart = buildSalesChart(
    (salesByDayResult.data ?? []) as SalesByDayRow[],
    chartRange.from,
    chartRange.to
  )

  const recentPurchases: RecentPurchaseActivity[] = (
    recentPurchasesResult.data ?? []
  ).map((row) => ({
    id: row.id,
    documentNumber: row.document_number,
    supplierName: row.suppliers?.name ?? "Unknown supplier",
    total: Number(row.total),
    status: row.status,
    receivedAt: row.ordered_at,
  }))

  const recentReturns: RecentReturnActivity[] = (recentReturnsResult.data ?? []).map(
    (row) => ({
      id: row.id,
      documentNumber: row.document_number,
      saleDocumentNumber: row.sales?.document_number ?? "Unknown sale",
      totalQuantity: (row.return_items ?? []).reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
      reason: row.reason ?? "—",
      createdAt: row.created_at,
    })
  )

  const revenueToday = Number(todaySummary?.net_revenue ?? 0)
  const revenueYesterday = Number(yesterdaySummary?.net_revenue ?? 0)
  const revenueMonth = Number(monthSummary?.net_revenue ?? 0)
  const revenuePreviousMonth = Number(previousMonthSummary?.net_revenue ?? 0)
  const estimatedGrossProfitMonth = Number(
    monthSummary?.estimated_gross_profit ?? 0
  )
  const estimatedGrossProfitMargin =
    revenueMonth > 0 ? (estimatedGrossProfitMonth / revenueMonth) * 100 : null

  return {
    metrics: {
      salesTodayCount: Number(todaySummary?.sales_count ?? 0),
      revenueToday,
      salesTodayChange: canViewFinancials
        ? percentChange(revenueToday, revenueYesterday)
        : null,
      salesMonthCount: Number(monthSummary?.sales_count ?? 0),
      revenueMonth,
      revenueMonthChange: canViewFinancials
        ? percentChange(revenueMonth, revenuePreviousMonth)
        : null,
      estimatedGrossProfitMonth,
      estimatedGrossProfitMargin,
      inventoryValue,
      activeProductsCount: activeProductsResult.count ?? 0,
      totalUnitsInStock,
      lowStockCount,
      outOfStockCount,
    },
    lowStockProducts,
    recentSales,
    recentMovements,
    topProducts,
    salesChart,
    salesChartRangeDays: chartRangeDays,
    recentPurchases,
    recentReturns,
    canViewFinancials,
    organizationName: user.organizationName,
    generatedAt: now.toISOString(),
  }
}
