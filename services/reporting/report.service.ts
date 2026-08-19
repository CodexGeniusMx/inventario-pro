import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  canViewPurchaseFinancials,
  stripInventoryReportRows,
  stripSalesReportSummary,
} from "@/lib/auth/financial-data"
import type { Database } from "@/lib/database.types"
import { logSalesReportRpcFailure } from "@/lib/reports/log-query-error"
import { resolveReportDateRange } from "@/lib/reports/date-ranges"
import type { ParsedReportFilters } from "@/lib/validations/report.schema"
import { createClient } from "@/lib/supabase/server"
import { READ } from "@/lib/db/read-models"
import { fetchVariantDisplayMeta } from "@/lib/db/variant-meta"
import type {
  InventoryReportRow,
  MovementReportRow,
  ProductReportRow,
  PurchaseReportRow,
  SalesReportRow,
  SalesReportSummary,
} from "@/types/reports"

type SalesSummaryRpcRow = {
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

function mapMovementReference(row: {
  sales?: { document_number: string } | null
  purchase_receipts?: { document_number: string } | null
  returns?: { document_number: string } | null
  stock_adjustments?: { document_number: string } | null
}): string {
  return (
    row.sales?.document_number ??
    row.purchase_receipts?.document_number ??
    row.returns?.document_number ??
    row.stock_adjustments?.document_number ??
    "—"
  )
}

export async function getSalesReport(
  user: AuthenticatedUser,
  filters: ParsedReportFilters
): Promise<{ summary: SalesReportSummary; rows: SalesReportRow[] }> {
  const range = resolveReportDateRange({
    ...filters,
    timeZone: user.organizationTimezone,
  })
  const supabase = await createClient()

  const summaryQuery = supabase.rpc("report_sales_summary", {
    p_organization_id: user.organizationId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  })

  let salesQuery = supabase
    .from("sales")
    .select(
      `
        id,
        document_number,
        completed_at,
        total,
        discount_amount,
        status,
        customers ( name ),
        warehouses ( name ),
        sale_items ( quantity, quantity_returned, line_total )
      `
    )
    .eq("organization_id", user.organizationId)
    .in("status", ["completed", "partially_returned", "fully_returned"])
    .gte("completed_at", range.from.toISOString())
    .lt("completed_at", range.to.toISOString())
    .order("completed_at", { ascending: false })

  if (filters.warehouseId) {
    salesQuery = salesQuery.eq("warehouse_id", filters.warehouseId)
  }

  if (filters.customerId) {
    salesQuery = salesQuery.eq("customer_id", filters.customerId)
  }

  const [{ data: summaryData, error: summaryError }, { data: salesData, error: salesError }] =
    await Promise.all([summaryQuery, salesQuery])

  if (summaryError) {
    logSalesReportRpcFailure("report_sales_summary.sales_report", summaryError, {
      rpc: "report_sales_summary",
      organizationId: user.organizationId,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    })
    throw summaryError
  }

  if (salesError) {
    logSalesReportRpcFailure("sales.list.sales_report", salesError, {
      query: "sales",
      organizationId: user.organizationId,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    })
    throw salesError
  }

  const summaryRow = (
    Array.isArray(summaryData) ? summaryData[0] : summaryData
  ) as SalesSummaryRpcRow | undefined

  const summary: SalesReportSummary = {
    salesCount: Number(summaryRow?.sales_count ?? 0),
    unitsSold: Number(summaryRow?.units_sold ?? 0),
    returnUnits: Number(summaryRow?.return_units ?? 0),
    grossRevenue: Number(summaryRow?.gross_revenue ?? 0),
    netRevenue: Number(summaryRow?.net_revenue ?? 0),
    discountTotal: Number(summaryRow?.discount_total ?? 0),
    returnRevenue: Number(summaryRow?.return_revenue ?? 0),
    estimatedCogs: Number(summaryRow?.estimated_cogs ?? 0),
    estimatedGrossProfit: Number(summaryRow?.estimated_gross_profit ?? 0),
  }

  const rows: SalesReportRow[] = (salesData ?? []).map((sale) => {
    const items = sale.sale_items ?? []
    const unitsSold = items.reduce(
      (sum, item) => sum + (item.quantity - item.quantity_returned),
      0
    )
    const netTotal = items.reduce((sum, item) => {
      const netQuantity = item.quantity - item.quantity_returned
      if (item.quantity <= 0) {
        return sum
      }

      return sum + (netQuantity / item.quantity) * Number(item.line_total)
    }, 0)

    return {
      id: sale.id,
      documentNumber: sale.document_number,
      completedAt: sale.completed_at,
      customerName: sale.customers?.name ?? null,
      warehouseName: sale.warehouses?.name ?? "Almacén desconocido",
      itemCount: items.length,
      unitsSold,
      grossTotal: Number(sale.total),
      netTotal,
      discountAmount: Number(sale.discount_amount),
      status: sale.status,
    }
  })

  return {
    summary: stripSalesReportSummary(summary, user),
    rows,
  }
}

export async function getInventoryReport(
  user: AuthenticatedUser,
  filters: ParsedReportFilters
): Promise<InventoryReportRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("v_inventory_valuation")
    .select(
      `
        product_id,
        product_name,
        product_variant_id,
        variant_name,
        sku,
        warehouse_id,
        warehouse_name,
        quantity_on_hand,
        unit_cost,
        inventory_value
      `
    )
    .eq("organization_id", user.organizationId)
    .order("product_name", { ascending: true })

  if (filters.warehouseId) {
    query = query.eq("warehouse_id", filters.warehouseId)
  }

  if (filters.productVariantId) {
    query = query.eq("product_variant_id", filters.productVariantId)
  }

  const { data: valuationData, error: valuationError } = await query

  if (valuationError) {
    throw valuationError
  }

  let statusQuery = supabase
    .from("v_inventory_status")
    .select("product_variant_id, warehouse_id, reorder_point, stock_status")
    .eq("organization_id", user.organizationId)

  if (filters.warehouseId) {
    statusQuery = statusQuery.eq("warehouse_id", filters.warehouseId)
  }

  const { data: statusData, error: statusError } = await statusQuery

  if (statusError) {
    throw statusError
  }

  const statusMap = new Map<string, { reorderPoint: number; stockStatus: string }>()

  for (const row of statusData ?? []) {
    statusMap.set(`${row.product_variant_id}:${row.warehouse_id}`, {
      reorderPoint: row.reorder_point ?? 0,
      stockStatus: row.stock_status ?? "in_stock",
    })
  }

  const rows = (valuationData ?? []).map((row) => {
    const status = statusMap.get(`${row.product_variant_id}:${row.warehouse_id}`)

    return {
      productId: row.product_id ?? "",
      productName: row.product_name ?? "Producto desconocido",
      productVariantId: row.product_variant_id ?? "",
      variantName: row.variant_name ?? "Default",
      sku: row.sku ?? "—",
      warehouseId: row.warehouse_id ?? "",
      warehouseName: row.warehouse_name ?? "Almacén desconocido",
      quantityOnHand: row.quantity_on_hand ?? 0,
      reorderPoint: status?.reorderPoint ?? 0,
      stockStatus: status?.stockStatus ?? "in_stock",
      unitCost: Number(row.unit_cost ?? 0),
      inventoryValue: Number(row.inventory_value ?? 0),
    }
  })

  return stripInventoryReportRows(rows, user)
}

export async function getMovementReport(
  user: AuthenticatedUser,
  filters: ParsedReportFilters
): Promise<MovementReportRow[]> {
  const range = resolveReportDateRange({
    ...filters,
    timeZone: user.organizationTimezone,
  })
  const supabase = await createClient()

  let query = supabase
    .from("inventory_movements")
    .select(
      `
        id,
        created_at,
        movement_type,
        quantity,
        quantity_before,
        quantity_after,
        reason,
        product_variant_id,
        warehouses ( name ),
        profiles!inventory_movements_created_by_fkey ( full_name ),
        sales ( document_number ),
        purchase_receipts ( document_number ),
        returns!inventory_movements_return_id_fkey ( document_number ),
        stock_adjustments ( document_number )
      `
    )
    .eq("organization_id", user.organizationId)
    .gte("created_at", range.from.toISOString())
    .lt("created_at", range.to.toISOString())
    .order("created_at", { ascending: false })
    .limit(500)

  if (filters.warehouseId) {
    query = query.eq("warehouse_id", filters.warehouseId)
  }

  if (filters.productVariantId) {
    query = query.eq("product_variant_id", filters.productVariantId)
  }

  if (filters.movementType) {
    query = query.eq(
      "movement_type",
      filters.movementType as Database["public"]["Enums"]["movement_type"]
    )
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const variantMeta = await fetchVariantDisplayMeta(
    supabase,
    (data ?? []).map((row) => row.product_variant_id)
  )

  return (data ?? []).map((row) => {
    const meta = variantMeta.get(row.product_variant_id)

    return {
    id: row.id,
    createdAt: row.created_at,
    movementType: row.movement_type,
    productName: meta?.productName ?? "Producto desconocido",
    variantName: meta?.name ?? "Default",
    sku: meta?.sku ?? "—",
    warehouseName: row.warehouses?.name ?? "Almacén desconocido",
    quantity: row.quantity,
    quantityBefore: row.quantity_before,
    quantityAfter: row.quantity_after,
    userName: row.profiles?.full_name ?? "Usuario desconocido",
    reference: mapMovementReference(row),
    reason: row.reason,
  }})
}

export async function getPurchaseReport(
  user: AuthenticatedUser,
  filters: ParsedReportFilters
): Promise<PurchaseReportRow[]> {
  const range = resolveReportDateRange({
    ...filters,
    timeZone: user.organizationTimezone,
  })
  const supabase = await createClient()

  let query = supabase
    .from(READ.purchaseOrders)
    .select(
      "id, document_number, status, total, currency_code, ordered_at, supplier_id, warehouse_id"
    )
    .eq("organization_id", user.organizationId)
    .gte("created_at", range.from.toISOString())
    .lt("created_at", range.to.toISOString())
    .order("created_at", { ascending: false })

  if (filters.supplierId) {
    query = query.eq("supplier_id", filters.supplierId)
  }

  if (filters.warehouseId) {
    query = query.eq("warehouse_id", filters.warehouseId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const receiptQuery = await supabase
    .from("purchase_receipts")
    .select("purchase_order_id, received_at")
    .eq("organization_id", user.organizationId)
    .order("received_at", { ascending: false })

  if (receiptQuery.error) {
    throw receiptQuery.error
  }

  const lastReceivedMap = new Map<string, string>()

  for (const receipt of receiptQuery.data ?? []) {
    if (!lastReceivedMap.has(receipt.purchase_order_id)) {
      lastReceivedMap.set(receipt.purchase_order_id, receipt.received_at)
    }
  }

  const includeFinancials = canViewPurchaseFinancials(user)
  const orderRows = (data ?? []).filter(
    (row): row is (typeof data)[number] & { id: string } => Boolean(row.id)
  )
  const orderIds = orderRows.map((row) => row.id)
  const supplierIds = Array.from(
    new Set(orderRows.map((row) => row.supplier_id).filter((id): id is string => Boolean(id)))
  )
  const warehouseIds = Array.from(
    new Set(orderRows.map((row) => row.warehouse_id).filter((id): id is string => Boolean(id)))
  )
  const [supplierNames, warehouseNames] = await Promise.all([
    supplierIds.length > 0
      ? supabase.from("suppliers").select("id, name").in("id", supplierIds)
      : Promise.resolve({ data: [], error: null }),
    warehouseIds.length > 0
      ? supabase.from("warehouses").select("id, name").in("id", warehouseIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const supplierNameMap = new Map(
    (supplierNames.data ?? []).map((row) => [row.id, row.name] as const)
  )
  const warehouseNameMap = new Map(
    (warehouseNames.data ?? []).map((row) => [row.id, row.name] as const)
  )
  const itemsByOrder = new Map<
    string,
    Array<{ quantity_ordered: number; quantity_received: number }>
  >()

  if (orderIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabase
      .from(READ.purchaseOrderItems)
      .select("purchase_order_id, quantity_ordered, quantity_received")
      .in("purchase_order_id", orderIds)

    if (itemsError) {
      throw itemsError
    }

    for (const item of itemRows ?? []) {
      if (!item.purchase_order_id) {
        continue
      }

      const bucket = itemsByOrder.get(item.purchase_order_id) ?? []
      bucket.push({
        quantity_ordered: item.quantity_ordered ?? 0,
        quantity_received: item.quantity_received ?? 0,
      })
      itemsByOrder.set(item.purchase_order_id, bucket)
    }
  }

  return orderRows.map((row) => {
    const items = itemsByOrder.get(row.id) ?? []

    return {
      id: row.id,
      documentNumber: row.document_number ?? "—",
      supplierName: row.supplier_id
        ? supplierNameMap.get(row.supplier_id) ?? "Proveedor desconocido"
        : "Proveedor desconocido",
      warehouseName: row.warehouse_id
        ? warehouseNameMap.get(row.warehouse_id) ?? "Almacén desconocido"
        : "Almacén desconocido",
      status: row.status ?? "draft",
      orderedAt: row.ordered_at ?? new Date(0).toISOString(),
      total: includeFinancials ? Number(row.total ?? 0) : 0,
      currencyCode: row.currency_code ?? user.organizationBaseCurrency,
      unitsOrdered: items.reduce((sum, item) => sum + item.quantity_ordered, 0),
      unitsReceived: items.reduce((sum, item) => sum + item.quantity_received, 0),
      lastReceivedAt: lastReceivedMap.get(row.id) ?? null,
    }
  })
}

export async function getProductReport(
  user: AuthenticatedUser,
  filters: ParsedReportFilters
): Promise<ProductReportRow[]> {
  const range = resolveReportDateRange({
    ...filters,
    timeZone: user.organizationTimezone,
  })
  const supabase = await createClient()

  const [{ data: topProducts, error: topError }, { data: inventoryRows, error: inventoryError }] =
    await Promise.all([
      supabase.rpc("report_top_products", {
        p_organization_id: user.organizationId,
        p_from: range.from.toISOString(),
        p_to: range.to.toISOString(),
        p_limit: 100,
      }),
      supabase
        .from("v_inventory_status")
        .select(
          "product_variant_id, product_name, variant_name, sku, quantity_on_hand, stock_status, updated_at"
        )
        .eq("organization_id", user.organizationId),
    ])

  if (topError) {
    throw topError
  }

  if (inventoryError) {
    throw inventoryError
  }

  const inventoryMap = new Map<
    string,
    {
      productName: string
      variantName: string
      sku: string
      quantityOnHand: number
      stockStatus: string | null
      lastMovementAt: string | null
    }
  >()

  for (const row of inventoryRows ?? []) {
    inventoryMap.set(row.product_variant_id ?? "", {
      productName: row.product_name ?? "Producto desconocido",
      variantName: row.variant_name ?? "Default",
      sku: row.sku ?? "—",
      quantityOnHand: row.quantity_on_hand ?? 0,
      stockStatus: row.stock_status,
      lastMovementAt: row.updated_at,
    })
  }

  const rows = new Map<string, ProductReportRow>()

  for (const product of (topProducts ?? []) as unknown as Array<{
    product_variant_id: string
    product_name: string
    variant_name: string
    sku: string
    units_sold: number | null
    return_units: number | null
    net_revenue: number | null
    return_revenue: number | null
  }>) {
    const inventory = inventoryMap.get(product.product_variant_id)

    rows.set(product.product_variant_id, {
      productVariantId: product.product_variant_id,
      productName: product.product_name,
      variantName: product.variant_name,
      sku: product.sku,
      unitsSold: Number(product.units_sold ?? 0),
      returnUnits: Number(product.return_units ?? 0),
      netRevenue: Number(product.net_revenue ?? 0),
      returnRevenue: Number(product.return_revenue ?? 0),
      quantityOnHand: inventory?.quantityOnHand ?? 0,
      stockStatus: inventory?.stockStatus ?? null,
      lastMovementAt: inventory?.lastMovementAt ?? null,
    })
  }

  for (const [variantId, inventory] of inventoryMap.entries()) {
    if (rows.has(variantId)) {
      continue
    }

    if (
      inventory.stockStatus === "low_stock" ||
      inventory.stockStatus === "out_of_stock"
    ) {
      rows.set(variantId, {
        productVariantId: variantId,
        productName: inventory.productName,
        variantName: inventory.variantName,
        sku: inventory.sku,
        unitsSold: 0,
        returnUnits: 0,
        netRevenue: 0,
        returnRevenue: 0,
        quantityOnHand: inventory.quantityOnHand,
        stockStatus: inventory.stockStatus,
        lastMovementAt: inventory.lastMovementAt,
      })
    }
  }

  return Array.from(rows.values()).sort((left, right) => {
    if (right.unitsSold !== left.unitsSold) {
      return right.unitsSold - left.unitsSold
    }

    return left.productName.localeCompare(right.productName)
  })
}

export async function listReportFilterOptions(user: AuthenticatedUser) {
  const supabase = await createClient()

  const [warehouses, suppliers, customers] = await Promise.all([
    supabase
      .from("warehouses")
      .select("id, name")
      .eq("organization_id", user.organizationId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("organization_id", user.organizationId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", user.organizationId)
      .eq("is_active", true)
      .order("name"),
  ])

  if (warehouses.error) {
    throw warehouses.error
  }

  if (suppliers.error) {
    throw suppliers.error
  }

  if (customers.error) {
    throw customers.error
  }

  return {
    warehouses: warehouses.data ?? [],
    suppliers: suppliers.data ?? [],
    customers: customers.data ?? [],
    movementTypes: [
      "initial_stock",
      "purchase_receipt",
      "sale",
      "sale_return",
      "adjustment_increase",
      "adjustment_decrease",
      "damage",
      "loss",
      "transfer_in",
      "transfer_out",
    ],
  }
}
