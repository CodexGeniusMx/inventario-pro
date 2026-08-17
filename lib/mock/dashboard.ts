export type DashboardMetrics = {
  todaysSales: number
  todaysSalesCount: number
  todaysSalesChange: number
  monthlySales: number
  monthlySalesChange: number
  estimatedProfit: number
  profitMargin: number
  inventoryValue: number
  lowStockCount: number
  outOfStockCount: number
}

export type RecentSale = {
  id: string
  saleNumber: string
  customer: string
  total: number
  itemCount: number
  status: "completed" | "draft" | "partially_returned"
  createdAt: Date
}

export type InventoryMovement = {
  id: string
  type:
    | "sale"
    | "purchase_receipt"
    | "adjustment"
    | "damage"
    | "sale_return"
    | "initial_stock"
  product: string
  variant: string
  quantity: number
  user: string
  reference: string
  createdAt: Date
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
}

export type SalesChartPoint = {
  label: string
  sales: number
}

export const dashboardMetrics: DashboardMetrics = {
  todaysSales: 4285.5,
  todaysSalesCount: 12,
  todaysSalesChange: 8.4,
  monthlySales: 87420.0,
  monthlySalesChange: 12.3,
  estimatedProfit: 23150.0,
  profitMargin: 26.5,
  inventoryValue: 156890.0,
  lowStockCount: 8,
  outOfStockCount: 3,
}

export const lowStockProducts: LowStockProduct[] = [
  {
    product: "Wireless Optical Mouse",
    variant: "Black",
    sku: "WM-BLK-001",
    onHand: 4,
    reorderPoint: 15,
  },
  {
    product: "USB-C Charging Cable",
    variant: "2m White",
    sku: "USB-C-2M-W",
    onHand: 6,
    reorderPoint: 25,
  },
  {
    product: "A4 Copy Paper",
    variant: "500 sheets",
    sku: "PAP-A4-500",
    onHand: 8,
    reorderPoint: 20,
  },
]

export const recentSales: RecentSale[] = [
  {
    id: "1",
    saleNumber: "S-1042",
    customer: "María González",
    total: 342.5,
    itemCount: 4,
    status: "completed",
    createdAt: new Date(Date.now() - 12 * 60000),
  },
  {
    id: "2",
    saleNumber: "S-1041",
    customer: "TechFix Repairs",
    total: 1280.0,
    itemCount: 7,
    status: "completed",
    createdAt: new Date(Date.now() - 45 * 60000),
  },
  {
    id: "3",
    saleNumber: "S-1040",
    customer: "Walk-in customer",
    total: 89.99,
    itemCount: 2,
    status: "completed",
    createdAt: new Date(Date.now() - 2 * 3600000),
  },
  {
    id: "4",
    saleNumber: "S-1039",
    customer: "Café Central",
    total: 456.75,
    itemCount: 5,
    status: "partially_returned",
    createdAt: new Date(Date.now() - 4 * 3600000),
  },
  {
    id: "5",
    saleNumber: "S-1038",
    customer: "Distribuidora Norte",
    total: 2115.0,
    itemCount: 12,
    status: "completed",
    createdAt: new Date(Date.now() - 6 * 3600000),
  },
]

export const recentMovements: InventoryMovement[] = [
  {
    id: "1",
    type: "sale",
    product: "Wireless Optical Mouse",
    variant: "Black",
    quantity: -2,
    user: "Carlos Ruiz",
    reference: "S-1042",
    createdAt: new Date(Date.now() - 12 * 60000),
  },
  {
    id: "2",
    type: "purchase_receipt",
    product: "HP Laser Toner 85A",
    variant: "Standard yield",
    quantity: 24,
    user: "Ana Martínez",
    reference: "PO-0187",
    createdAt: new Date(Date.now() - 90 * 60000),
  },
  {
    id: "3",
    type: "adjustment",
    product: "Thermal Receipt Paper",
    variant: "80mm × 80m",
    quantity: -3,
    user: "Ana Martínez",
    reference: "ADJ-0041",
    createdAt: new Date(Date.now() - 3 * 3600000),
  },
  {
    id: "4",
    type: "damage",
    product: "Glass Screen Protector",
    variant: "iPhone 15",
    quantity: -1,
    user: "Carlos Ruiz",
    reference: "DMG-0012",
    createdAt: new Date(Date.now() - 5 * 3600000),
  },
  {
    id: "5",
    type: "sale_return",
    product: "Bluetooth Keyboard",
    variant: "Compact",
    quantity: 1,
    user: "Carlos Ruiz",
    reference: "R-0033",
    createdAt: new Date(Date.now() - 7 * 3600000),
  },
]

export const topProducts: TopProduct[] = [
  {
    rank: 1,
    product: "USB-C Charging Cable",
    variant: "2m White",
    sku: "USB-C-2M-W",
    unitsSold: 186,
    revenue: 2790.0,
  },
  {
    rank: 2,
    product: "Wireless Optical Mouse",
    variant: "Black",
    sku: "WM-BLK-001",
    unitsSold: 142,
    revenue: 3550.0,
  },
  {
    rank: 3,
    product: "HP Laser Toner 85A",
    variant: "Standard yield",
    sku: "TON-HP-85A",
    unitsSold: 98,
    revenue: 8820.0,
  },
  {
    rank: 4,
    product: "A4 Copy Paper",
    variant: "500 sheets",
    sku: "PAP-A4-500",
    unitsSold: 76,
    revenue: 456.0,
  },
  {
    rank: 5,
    product: "Bluetooth Keyboard",
    variant: "Compact",
    sku: "KB-BT-CMP",
    unitsSold: 64,
    revenue: 3840.0,
  },
]

export const weeklySalesChart: SalesChartPoint[] = [
  { label: "Mon", sales: 11240 },
  { label: "Tue", sales: 9850 },
  { label: "Wed", sales: 13420 },
  { label: "Thu", sales: 10890 },
  { label: "Fri", sales: 15670 },
  { label: "Sat", sales: 14230 },
  { label: "Sun", sales: 8120 },
]
