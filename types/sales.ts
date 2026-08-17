export type SaleStatus =
  | "draft"
  | "completed"
  | "cancelled"
  | "partially_returned"
  | "fully_returned"

export type SaleListItem = {
  id: string
  documentNumber: string
  status: SaleStatus
  customerId: string | null
  customerName: string | null
  warehouseId: string
  warehouseName: string
  completedAt: string | null
  createdAt: string
  total: number
  itemCount: number
  createdByName: string
}

export type SaleLine = {
  id: string
  productVariantId: string
  productName: string
  variantName: string
  sku: string
  quantity: number
  unitPrice: number
  lineTotal: number
  movementId: string | null
  quantityBefore: number | null
  quantityAfter: number | null
}

export type SaleDetail = {
  id: string
  documentNumber: string
  status: SaleStatus
  customerId: string | null
  customerName: string | null
  warehouseId: string
  warehouseName: string
  subtotal: number
  discountAmount: number
  total: number
  completedAt: string | null
  createdAt: string
  createdByName: string
  lines: SaleLine[]
}

export type SaleListFilters = {
  q?: string
  status?: SaleStatus | "all"
}

export type CreateSaleLineInput = {
  productVariantId: string
  quantity: number
}

export type CreateSaleInput = {
  warehouseId: string
  customerId?: string | null
  discountAmount?: number
  lines: CreateSaleLineInput[]
  idempotencyKey?: string
}

export type VariantSalePrice = {
  productVariantId: string
  unitPrice: number
}
