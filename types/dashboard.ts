export type DashboardMetrics = {
  salesTodayCount: number
  revenueToday: number
  salesTodayChange: number | null
  salesMonthCount: number
  revenueMonth: number
  revenueMonthChange: number | null
  estimatedGrossProfitMonth: number
  estimatedGrossProfitMargin: number | null
  inventoryValue: number
  activeProductsCount: number
  totalUnitsInStock: number
  lowStockCount: number
  outOfStockCount: number
}

export type RecentSale = {
  id: string
  saleNumber: string
  customer: string
  total: number
  itemCount: number
  status: "completed" | "draft" | "partially_returned" | "fully_returned" | "cancelled"
  createdAt: string
}

export type RecentInventoryMovement = {
  id: string
  type:
    | "sale"
    | "purchase_receipt"
    | "adjustment_increase"
    | "adjustment_decrease"
    | "damage"
    | "loss"
    | "sale_return"
    | "initial_stock"
    | "transfer_in"
    | "transfer_out"
  product: string
  variant: string
  quantity: number
  user: string
  reference: string
  createdAt: string
}

export type TopProduct = {
  rank: number
  product: string
  variant: string
  sku: string
  unitsSold: number
  revenue: number
}

export type LowStockProduct = {
  product: string
  variant: string
  sku: string
  onHand: number
  reorderPoint: number
  warehouseName: string
}

export type SalesChartPoint = {
  label: string
  date: string
  sales: number
  salesCount: number
}

export type RecentPurchaseReceiptActivity = {
  id: string
  documentNumber: string
  purchaseOrderNumber: string
  warehouseName: string
  itemCount: number
  receivedAt: string
}

export type RecentAdjustmentActivity = {
  id: string
  documentNumber: string
  adjustmentType: string
  warehouseName: string
  itemCount: number
  createdAt: string
}

export type RecentPurchaseActivity = {
  id: string
  documentNumber: string
  supplierName: string
  total: number
  status: string
  receivedAt: string | null
}

export type RecentReturnActivity = {
  id: string
  documentNumber: string
  saleDocumentNumber: string
  totalQuantity: number
  reason: string
  createdAt: string
}

export type DashboardSummary = {
  metrics: DashboardMetrics
  lowStockProducts: LowStockProduct[]
  recentSales: RecentSale[]
  recentMovements: RecentInventoryMovement[]
  topProducts: TopProduct[]
  salesChart: SalesChartPoint[]
  salesChartRangeDays: 7 | 30
  recentPurchases: RecentPurchaseActivity[]
  recentReceipts: RecentPurchaseReceiptActivity[]
  recentAdjustments: RecentAdjustmentActivity[]
  recentReturns: RecentReturnActivity[]
  canViewFinancials: boolean
  organizationName: string
  generatedAt: string
}
