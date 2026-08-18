import { NextResponse } from "next/server"

import { requirePermission } from "@/lib/auth/session"
import { buildCsv } from "@/lib/reports/csv"
import { reportFiltersSchema } from "@/lib/validations/report.schema"
import {
  getInventoryReport,
  getMovementReport,
  getProductReport,
  getPurchaseReport,
  getSalesReport,
} from "@/services/reporting/report.service"
import { REPORT_DEFINITIONS, type ReportSlug } from "@/types/reports"

type RouteContext = {
  params: Promise<{ slug: string }>
}

function isReportSlug(value: string): value is ReportSlug {
  return REPORT_DEFINITIONS.some((report) => report.slug === value)
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const user = await requirePermission("reports", "read")
  const { slug } = await context.params

  if (!isReportSlug(slug)) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 })
  }

  const url = new URL(request.url)
  const parsedFilters = reportFiltersSchema.safeParse({
    preset: url.searchParams.get("preset") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    warehouseId: url.searchParams.get("warehouseId") ?? undefined,
    supplierId: url.searchParams.get("supplierId") ?? undefined,
    customerId: url.searchParams.get("customerId") ?? undefined,
    movementType: url.searchParams.get("movementType") ?? undefined,
  })

  const filters = parsedFilters.success
    ? parsedFilters.data
    : reportFiltersSchema.parse({})

  let csv = ""

  if (slug === "sales") {
    const { summary, rows } = await getSalesReport(user, filters)
    csv = buildCsv(
      [
        "metric",
        "value",
      ],
      [
        ["sales_count", summary.salesCount],
        ["units_sold", summary.unitsSold],
        ["net_revenue", summary.netRevenue],
        ["discount_total", summary.discountTotal],
        ["return_units", summary.returnUnits],
        ["return_revenue", summary.returnRevenue],
        ["estimated_cogs", summary.estimatedCogs],
        ["estimated_gross_profit", summary.estimatedGrossProfit],
      ]
    )
    csv += buildCsv(
      [
        "sale_number",
        "completed_at",
        "customer",
        "warehouse",
        "items",
        "units",
        "net_total",
        "discount",
        "status",
      ],
      rows.map((row) => [
        row.documentNumber,
        row.completedAt ?? "",
        row.customerName ?? "",
        row.warehouseName,
        row.itemCount,
        row.unitsSold,
        row.netTotal,
        row.discountAmount,
        row.status,
      ])
    )
  }

  if (slug === "inventory") {
    const rows = await getInventoryReport(user, filters)
    csv = buildCsv(
      [
        "product",
        "variant",
        "sku",
        "warehouse",
        "stock",
        "reorder_point",
        "stock_status",
        "unit_cost",
        "inventory_value",
      ],
      rows.map((row) => [
        row.productName,
        row.variantName,
        row.sku,
        row.warehouseName,
        row.quantityOnHand,
        row.reorderPoint,
        row.stockStatus,
        row.unitCost,
        row.inventoryValue,
      ])
    )
  }

  if (slug === "movements") {
    const rows = await getMovementReport(user, filters)
    csv = buildCsv(
      [
        "date",
        "type",
        "product",
        "variant",
        "sku",
        "warehouse",
        "quantity",
        "quantity_before",
        "quantity_after",
        "user",
        "reference",
        "reason",
      ],
      rows.map((row) => [
        row.createdAt,
        row.movementType,
        row.productName,
        row.variantName,
        row.sku,
        row.warehouseName,
        row.quantity,
        row.quantityBefore,
        row.quantityAfter,
        row.userName,
        row.reference,
        row.reason ?? "",
      ])
    )
  }

  if (slug === "purchases") {
    const rows = await getPurchaseReport(user, filters)
    csv = buildCsv(
      [
        "po_number",
        "supplier",
        "warehouse",
        "status",
        "ordered_at",
        "total",
        "ordered_qty",
        "received_qty",
        "last_received_at",
      ],
      rows.map((row) => [
        row.documentNumber,
        row.supplierName,
        row.warehouseName,
        row.status,
        row.orderedAt ?? "",
        row.total,
        row.unitsOrdered,
        row.unitsReceived,
        row.lastReceivedAt ?? "",
      ])
    )
  }

  if (slug === "products") {
    const rows = await getProductReport(user, filters)
    csv = buildCsv(
      [
        "product",
        "variant",
        "sku",
        "units_sold",
        "return_units",
        "net_revenue",
        "return_revenue",
        "on_hand",
        "stock_status",
        "last_movement_at",
      ],
      rows.map((row) => [
        row.productName,
        row.variantName,
        row.sku,
        row.unitsSold,
        row.returnUnits,
        row.netRevenue,
        row.returnRevenue,
        row.quantityOnHand,
        row.stockStatus ?? "",
        row.lastMovementAt ?? "",
      ])
    )
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-report.csv"`,
    },
  })
}
