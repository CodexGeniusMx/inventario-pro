export type ReportDatePreset =
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "custom"

export type ReportFilters = {
  preset?: ReportDatePreset
  from?: string
  to?: string
  warehouseId?: string
  productVariantId?: string
  supplierId?: string
  customerId?: string
  movementType?: string
  q?: string
}

export type SalesReportSummary = {
  salesCount: number
  unitsSold: number
  returnUnits: number
  grossRevenue: number
  netRevenue: number
  discountTotal: number
  returnRevenue: number
  estimatedCogs: number
  estimatedGrossProfit: number
}

export type SalesReportRow = {
  id: string
  documentNumber: string
  completedAt: string | null
  customerName: string | null
  warehouseName: string
  itemCount: number
  unitsSold: number
  grossTotal: number
  netTotal: number
  discountAmount: number
  status: string
}

export type InventoryReportRow = {
  productId: string
  productName: string
  productVariantId: string
  variantName: string
  sku: string
  warehouseId: string
  warehouseName: string
  quantityOnHand: number
  reorderPoint: number
  stockStatus: string
  unitCost: number
  inventoryValue: number
}

export type MovementReportRow = {
  id: string
  createdAt: string
  movementType: string
  productName: string
  variantName: string
  sku: string
  warehouseName: string
  quantity: number
  quantityBefore: number
  quantityAfter: number
  userName: string
  reference: string
  reason: string | null
}

export type PurchaseReportRow = {
  id: string
  documentNumber: string
  supplierName: string
  warehouseName: string
  status: string
  orderedAt: string | null
  total: number
  currencyCode: string
  unitsOrdered: number
  unitsReceived: number
  lastReceivedAt: string | null
}

export type ProductReportRow = {
  productVariantId: string
  productName: string
  variantName: string
  sku: string
  unitsSold: number
  returnUnits: number
  netRevenue: number
  returnRevenue: number
  quantityOnHand: number
  stockStatus: string | null
  lastMovementAt: string | null
}

export type ReportSlug =
  | "sales"
  | "inventory"
  | "movements"
  | "purchases"
  | "products"

export const REPORT_DEFINITIONS: Array<{
  slug: ReportSlug
  title: string
  description: string
}> = [
  {
    slug: "sales",
    title: "Reporte de ventas",
    description: "Ventas completadas, ingresos, descuentos, devoluciones y utilidad bruta estimada.",
  },
  {
    slug: "inventory",
    title: "Reporte de inventario",
    description: "Stock disponible, puntos de reorden, estado y valor de inventario al costo.",
  },
  {
    slug: "movements",
    title: "Movimientos de inventario",
    description: "Registros inmutables con cantidades antes/después y referencias.",
  },
  {
    slug: "purchases",
    title: "Reporte de compras",
    description: "Órdenes de compra, cantidades recibidas, totales por proveedor y estado.",
  },
  {
    slug: "products",
    title: "Reporte de productos",
    description: "Más vendidos, devoluciones, stock bajo y variantes sin stock.",
  },
]
