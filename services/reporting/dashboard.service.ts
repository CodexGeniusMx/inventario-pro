import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"

import { hasPermission } from "@/lib/auth/permissions"
import type { AuthenticatedUser } from "@/lib/auth/types"
import type { Database } from "@/lib/database.types"
import { logQueryError, logSalesReportRpcFailure } from "@/lib/reports/log-query-error"
import {
  buildChartDayKeys,
  formatChartDayLabel,
  percentChange,
  resolveReportDateRange,
} from "@/lib/reports/date-ranges"
import {
  addZonedDays,
  startOfZonedMonth,
} from "@/lib/reports/timezone"
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

const EMPTY_SALES_SUMMARY: SalesSummaryRow = {
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

const RECENT_MOVEMENTS_SELECT = `
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
  returns!inventory_movements_return_id_fkey ( document_number ),
  stock_adjustments ( document_number )
`

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

async function runCountQuery(
  source: string,
  query: PromiseLike<{ count: number | null; error: PostgrestError | null }>
): Promise<number> {
  try {
    const { count, error } = await query

    if (error) {
      logQueryError(source, error)
      return 0
    }

    return count ?? 0
  } catch (error) {
    logQueryError(source, error)
    return 0
  }
}

async function runQuery<T>(
  source: string,
  query: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  fallback: T
): Promise<T> {
  try {
    const { data, error } = await query

    if (error) {
      logQueryError(source, error)
      return fallback
    }

    return data ?? fallback
  } catch (error) {
    logQueryError(source, error)
    return fallback
  }
}

async function callReportSalesSummary(
  supabase: SupabaseClient<Database>,
  source: string,
  organizationId: string,
  from: Date,
  to: Date
): Promise<SalesSummaryRow> {
  const { data, error } = await supabase.rpc("report_sales_summary", {
    p_organization_id: organizationId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  })

  if (error) {
    logSalesReportRpcFailure(source, error, {
      rpc: "report_sales_summary",
      organizationId,
      from: from.toISOString(),
      to: to.toISOString(),
    })
    throw error
  }

  const row = (Array.isArray(data) ? data[0] : data) as SalesSummaryRow | undefined
  return row ?? EMPTY_SALES_SUMMARY
}

async function fetchSalesSummary(
  supabase: SupabaseClient<Database>,
  source: string,
  organizationId: string,
  from: Date,
  to: Date
): Promise<SalesSummaryRow> {
  try {
    return await callReportSalesSummary(
      supabase,
      source,
      organizationId,
      from,
      to
    )
  } catch {
    return EMPTY_SALES_SUMMARY
  }
}

function buildSalesChart(
  rows: SalesByDayRow[],
  from: Date,
  to: Date,
  timeZone: string
): SalesChartPoint[] {
  const revenueByDay = new Map<string, SalesByDayRow>()

  for (const row of rows) {
    revenueByDay.set(row.day, row)
  }

  return buildChartDayKeys(from, to, timeZone).map(({ key, year, month, day }) => {
    const row = revenueByDay.get(key)

    return {
      label: formatChartDayLabel(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, timeZone),
      date: key,
      sales: Number(row?.net_revenue ?? 0),
      salesCount: Number(row?.sales_count ?? 0),
    }
  })
}

export async function getDashboardSummary(
  user: AuthenticatedUser,
  options: { chartRangeDays?: 7 | 30 } = {}
): Promise<DashboardSummary> {
  const chartRangeDays = options.chartRangeDays ?? 7
  const canViewFinancials = hasPermission(user, "reports", "read")
  const timeZone = user.organizationTimezone
  const now = new Date()

  const todayRange = resolveReportDateRange({ preset: "today", now, timeZone })
  const monthRange = resolveReportDateRange({ preset: "this_month", now, timeZone })
  const yesterdayStart = addZonedDays(todayRange.from, -1, timeZone)
  const yesterdayRange = {
    from: yesterdayStart,
    to: todayRange.from,
    preset: "custom" as const,
    label: "Yesterday",
    timeZone,
  }
  const previousMonthStart = startOfZonedMonth(
    addZonedDays(startOfZonedMonth(now, timeZone), -1, timeZone),
    timeZone
  )
  const previousMonthEnd = startOfZonedMonth(now, timeZone)
  const chartRange = resolveReportDateRange({
    preset: chartRangeDays === 7 ? "last_7_days" : "last_30_days",
    now,
    timeZone,
  })

  const supabase = await createClient()

  const [
    todaySummary,
    yesterdaySummary,
    monthSummary,
    previousMonthSummary,
    valuationRows,
    inventoryStatusRows,
    activeProductsCount,
    recentSalesRows,
    recentMovementRows,
    topProductRows,
    salesByDayRows,
    recentPurchaseRows,
    recentReturnRows,
    recentReceiptRows,
    recentAdjustmentRows,
  ] = await Promise.all([
    canViewFinancials
      ? fetchSalesSummary(
          supabase,
          "report_sales_summary.today",
          user.organizationId,
          todayRange.from,
          todayRange.to
        )
      : Promise.resolve(EMPTY_SALES_SUMMARY),
    canViewFinancials
      ? fetchSalesSummary(
          supabase,
          "report_sales_summary.yesterday",
          user.organizationId,
          yesterdayRange.from,
          yesterdayRange.to
        )
      : Promise.resolve(EMPTY_SALES_SUMMARY),
    canViewFinancials
      ? fetchSalesSummary(
          supabase,
          "report_sales_summary.month",
          user.organizationId,
          monthRange.from,
          monthRange.to
        )
      : Promise.resolve(EMPTY_SALES_SUMMARY),
    canViewFinancials
      ? fetchSalesSummary(
          supabase,
          "report_sales_summary.previous_month",
          user.organizationId,
          previousMonthStart,
          previousMonthEnd
        )
      : Promise.resolve(EMPTY_SALES_SUMMARY),
    runQuery(
      "v_inventory_valuation",
      supabase
        .from("v_inventory_valuation")
        .select("quantity_on_hand, inventory_value")
        .eq("organization_id", user.organizationId),
      []
    ),
    runQuery(
      "v_inventory_status",
      supabase
        .from("v_inventory_status")
        .select(
          "product_name, variant_name, sku, quantity_on_hand, reorder_point, stock_status, warehouse_name"
        )
        .eq("organization_id", user.organizationId),
      []
    ),
    runCountQuery(
      "products.active_count",
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", user.organizationId)
        .eq("status", "active")
        .is("deleted_at", null)
    ),
    runQuery(
      "sales.recent",
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
      []
    ),
    runQuery(
      "inventory_movements.recent",
      supabase
        .from("inventory_movements")
        .select(RECENT_MOVEMENTS_SELECT)
        .eq("organization_id", user.organizationId)
        .order("created_at", { ascending: false })
        .limit(5),
      []
    ),
    canViewFinancials
      ? runQuery(
          "report_top_products",
          supabase.rpc("report_top_products", {
            p_organization_id: user.organizationId,
            p_from: chartRange.from.toISOString(),
            p_to: chartRange.to.toISOString(),
            p_limit: 5,
          }),
          []
        )
      : Promise.resolve([]),
    canViewFinancials
      ? runQuery(
          "report_sales_by_day",
          supabase.rpc("report_sales_by_day", {
            p_organization_id: user.organizationId,
            p_from: chartRange.from.toISOString(),
            p_to: chartRange.to.toISOString(),
          }),
          []
        )
      : Promise.resolve([]),
    runQuery(
      "purchase_orders.recent",
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
      []
    ),
    runQuery(
      "returns.recent",
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
      []
    ),
    runQuery(
      "purchase_receipts.recent",
      supabase
        .from("purchase_receipts")
        .select(
          `
            id,
            document_number,
            received_at,
            warehouses ( name ),
            purchase_orders ( document_number ),
            purchase_receipt_items ( id )
          `
        )
        .eq("organization_id", user.organizationId)
        .order("received_at", { ascending: false })
        .limit(5),
      []
    ),
    runQuery(
      "stock_adjustments.recent",
      supabase
        .from("stock_adjustments")
        .select(
          `
            id,
            document_number,
            adjustment_type,
            created_at,
            warehouses ( name ),
            stock_adjustment_items ( id )
          `
        )
        .eq("organization_id", user.organizationId)
        .order("created_at", { ascending: false })
        .limit(5),
      []
    ),
  ])

  const inventoryValue = valuationRows.reduce(
    (sum, row) => sum + Number(row.inventory_value ?? 0),
    0
  )
  const totalUnitsInStock = valuationRows.reduce(
    (sum, row) => sum + Number(row.quantity_on_hand ?? 0),
    0
  )

  const lowStockProducts: LowStockProduct[] = inventoryStatusRows
    .filter((row) => row.stock_status === "low_stock")
    .slice(0, 5)
    .map((row) => ({
      product: row.product_name ?? "Producto desconocido",
      variant: row.variant_name ?? "Default",
      sku: row.sku ?? "—",
      onHand: row.quantity_on_hand ?? 0,
      reorderPoint: row.reorder_point ?? 0,
      warehouseName: row.warehouse_name ?? "Almacén desconocido",
    }))

  const lowStockCount = inventoryStatusRows.filter(
    (row) => row.stock_status === "low_stock"
  ).length
  const outOfStockCount = inventoryStatusRows.filter(
    (row) => row.stock_status === "out_of_stock"
  ).length

  const recentSales: RecentSale[] = recentSalesRows.map((row) => ({
    id: row.id,
    saleNumber: row.document_number,
    customer: row.customers?.name ?? "Cliente ocasional",
    total: Number(row.total),
    itemCount: row.sale_items?.length ?? 0,
    status: row.status,
    createdAt: row.completed_at ?? row.created_at,
  }))

  const recentMovements: RecentInventoryMovement[] = recentMovementRows.map(
    (row) => ({
      id: row.id,
      type: mapMovementType(row.movement_type),
      product: row.product_variants?.products?.name ?? "Producto desconocido",
      variant: row.product_variants?.name ?? "Default",
      quantity: row.quantity,
      user: row.profiles?.full_name ?? "Usuario desconocido",
      reference: mapMovementReference(row),
      createdAt: row.created_at,
    })
  )

  const topProducts: TopProduct[] = (topProductRows as TopProductRow[]).map(
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
    salesByDayRows as SalesByDayRow[],
    chartRange.from,
    chartRange.to,
    timeZone
  )

  const recentPurchases: RecentPurchaseActivity[] = recentPurchaseRows.map(
    (row) => ({
      id: row.id,
      documentNumber: row.document_number,
      supplierName: row.suppliers?.name ?? "Proveedor desconocido",
      total: Number(row.total),
      status: row.status,
      receivedAt: row.ordered_at,
    })
  )

  const recentReturns: RecentReturnActivity[] = recentReturnRows.map((row) => ({
    id: row.id,
    documentNumber: row.document_number,
    saleDocumentNumber: row.sales?.document_number ?? "Venta desconocida",
    totalQuantity: (row.return_items ?? []).reduce(
      (sum, item) => sum + item.quantity,
      0
    ),
    reason: row.reason ?? "—",
    createdAt: row.created_at,
  }))

  const recentReceipts = recentReceiptRows.map((row) => ({
    id: row.id,
    documentNumber: row.document_number,
    purchaseOrderNumber: row.purchase_orders?.document_number ?? "—",
    warehouseName: row.warehouses?.name ?? "Almacén desconocido",
    itemCount: row.purchase_receipt_items?.length ?? 0,
    receivedAt: row.received_at,
  }))

  const recentAdjustments = recentAdjustmentRows.map((row) => ({
    id: row.id,
    documentNumber: row.document_number,
    adjustmentType: row.adjustment_type,
    warehouseName: row.warehouses?.name ?? "Almacén desconocido",
    itemCount: row.stock_adjustment_items?.length ?? 0,
    createdAt: row.created_at,
  }))

  const revenueToday = Number(todaySummary.net_revenue ?? 0)
  const revenueYesterday = Number(yesterdaySummary.net_revenue ?? 0)
  const revenueMonth = Number(monthSummary.net_revenue ?? 0)
  const revenuePreviousMonth = Number(previousMonthSummary.net_revenue ?? 0)
  const estimatedGrossProfitMonth = Number(
    monthSummary.estimated_gross_profit ?? 0
  )
  const estimatedGrossProfitMargin =
    revenueMonth > 0 ? (estimatedGrossProfitMonth / revenueMonth) * 100 : null

  return {
    metrics: {
      salesTodayCount: Number(todaySummary.sales_count ?? 0),
      revenueToday,
      salesTodayChange: canViewFinancials
        ? percentChange(revenueToday, revenueYesterday)
        : null,
      salesMonthCount: Number(monthSummary.sales_count ?? 0),
      revenueMonth,
      revenueMonthChange: canViewFinancials
        ? percentChange(revenueMonth, revenuePreviousMonth)
        : null,
      estimatedGrossProfitMonth,
      estimatedGrossProfitMargin,
      inventoryValue,
      activeProductsCount,
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
    recentReceipts,
    recentAdjustments,
    recentReturns,
    canViewFinancials,
    organizationName: user.organizationName,
    generatedAt: now.toISOString(),
  }
}
