export type ReturnListItem = {
  id: string
  documentNumber: string
  saleId: string
  saleDocumentNumber: string
  warehouseName: string
  reason: string
  itemCount: number
  totalQuantity: number
  createdAt: string
  createdByName: string
}

export type ReturnLine = {
  id: string
  saleItemId: string
  productVariantId: string
  productName: string
  variantName: string
  sku: string
  quantity: number
  isRestockable: boolean
  quantityBefore: number | null
  quantityAfter: number | null
  restockMovementId: string | null
  damageMovementId: string | null
}

export type ReturnDetail = {
  id: string
  documentNumber: string
  saleId: string
  saleDocumentNumber: string
  warehouseId: string
  warehouseName: string
  reason: string
  notes: string | null
  createdAt: string
  createdByName: string
  lines: ReturnLine[]
}

export type SaleReturnLine = {
  id: string
  productVariantId: string
  productName: string
  variantName: string
  sku: string
  quantitySold: number
  quantityReturned: number
  quantityReturnable: number
  unitPrice: number
}

export type SaleReturnContext = {
  id: string
  documentNumber: string
  status: string
  warehouseId: string
  warehouseName: string
  customerName: string | null
  lines: SaleReturnLine[]
}

export type ProcessReturnLineInput = {
  saleItemId: string
  quantity: number
  isRestockable?: boolean
}

export type ProcessReturnInput = {
  saleId: string
  reason: string
  notes?: string | null
  lines: ProcessReturnLineInput[]
  idempotencyKey?: string
}

export type ReturnListFilters = {
  q?: string
}
