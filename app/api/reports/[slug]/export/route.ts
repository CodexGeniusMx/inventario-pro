import { NextResponse } from "next/server"

import { requirePermission } from "@/lib/auth/session"
import { movementTypeLabels, stockStatusLabels } from "@/lib/inventory/labels"
import { purchaseOrderStatusLabels } from "@/lib/purchasing/labels"
import { buildCsv } from "@/lib/reports/csv"
import { saleStatusLabels } from "@/lib/sales/labels"
import { reportFiltersSchema } from "@/lib/validations/report.schema"
import {
  getInventoryReport,
  getMovementReport,
  getProductReport,
  getPurchaseReport,
  getSalesReport,
} from "@/services/reporting/report.service"
import type { SaleStatus } from "@/types/sales"
import type { PurchaseOrderStatus } from "@/types/purchasing"
import type { MovementType, StockStatus } from "@/types/inventory"
import { REPORT_DEFINITIONS, type ReportSlug } from "@/types/reports"

type RouteContext = {
  params: Promise<{ slug: string }>
}

function isReportSlug(value: string): value is ReportSlug {
  return REPORT_DEFINITIONS.some((report) => report.slug === value)
}

function labelSaleStatus(status: string): string {
  return saleStatusLabels[status as SaleStatus] ?? status
}

function labelPurchaseStatus(status: string): string {
  return purchaseOrderStatusLabels[status as PurchaseOrderStatus] ?? status
}

function labelStockStatus(status: string): string {
  return stockStatusLabels[status as StockStatus] ?? status
}

function labelMovementType(type: string): string {
  return movementTypeLabels[type as MovementType] ?? type
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const user = await requirePermission("reports", "read")
  const { slug } = await context.params

  if (!isReportSlug(slug)) {
    return NextResponse.json({ error: "Reporte no encontrado." }, { status: 404 })
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
      ["metrica", "valor"],
      [
        ["cantidad_ventas", summary.salesCount],
        ["unidades_vendidas", summary.unitsSold],
        ["ingresos_netos", summary.netRevenue],
        ["descuentos", summary.discountTotal],
        ["unidades_devueltas", summary.returnUnits],
        ["ingresos_devoluciones", summary.returnRevenue],
        ["costo_ventas_estimado", summary.estimatedCogs],
        ["utilidad_bruta_estimada", summary.estimatedGrossProfit],
      ]
    )
    csv += buildCsv(
      [
        "numero_venta",
        "fecha_completada",
        "cliente",
        "almacen",
        "articulos",
        "unidades",
        "total_neto",
        "descuento",
        "estado",
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
        labelSaleStatus(row.status),
      ])
    )
  }

  if (slug === "inventory") {
    const rows = await getInventoryReport(user, filters)
    csv = buildCsv(
      [
        "producto",
        "variante",
        "sku",
        "almacen",
        "stock",
        "punto_reorden",
        "estado_stock",
        "costo_unitario",
        "valor_inventario",
      ],
      rows.map((row) => [
        row.productName,
        row.variantName,
        row.sku,
        row.warehouseName,
        row.quantityOnHand,
        row.reorderPoint,
        labelStockStatus(row.stockStatus),
        row.unitCost,
        row.inventoryValue,
      ])
    )
  }

  if (slug === "movements") {
    const rows = await getMovementReport(user, filters)
    csv = buildCsv(
      [
        "fecha",
        "tipo",
        "producto",
        "variante",
        "sku",
        "almacen",
        "cantidad",
        "cantidad_antes",
        "cantidad_despues",
        "usuario",
        "referencia",
        "motivo",
      ],
      rows.map((row) => [
        row.createdAt,
        labelMovementType(row.movementType),
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
        "numero_oc",
        "proveedor",
        "almacen",
        "estado",
        "fecha_orden",
        "total",
        "cantidad_ordenada",
        "cantidad_recibida",
        "ultima_recepcion",
      ],
      rows.map((row) => [
        row.documentNumber,
        row.supplierName,
        row.warehouseName,
        labelPurchaseStatus(row.status),
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
        "producto",
        "variante",
        "sku",
        "unidades_vendidas",
        "unidades_devueltas",
        "ingresos_netos",
        "ingresos_devoluciones",
        "en_existencia",
        "estado_stock",
        "ultimo_movimiento",
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
        labelStockStatus(row.stockStatus ?? ""),
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
