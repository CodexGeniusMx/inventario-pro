export type PurchaseOrderStatus =
  | "draft"
  | "ordered"
  | "partially_received"
  | "received"
  | "cancelled"

export type PurchaseOrderListItem = {
  id: string
  documentNumber: string
  status: PurchaseOrderStatus
  supplierId: string
  supplierName: string
  warehouseId: string
  warehouseName: string
  orderedAt: string | null
  createdAt: string
  total: number
  quantityOrdered: number
  quantityReceived: number
  createdByName: string
}

export type PurchaseOrderLine = {
  id: string
  productVariantId: string
  productName: string
  variantName: string
  sku: string
  quantityOrdered: number
  quantityReceived: number
  quantityRemaining: number
  unitCost: number
  lineTotal: number
}

export type PurchaseReceiptSummary = {
  id: string
  documentNumber: string
  receivedAt: string
  createdByName: string
  notes: string | null
  lines: PurchaseReceiptLine[]
}

export type PurchaseReceiptLine = {
  id: string
  productName: string
  variantName: string
  sku: string
  quantityReceived: number
  unitCost: number
  movementId: string
  quantityBefore: number | null
  quantityAfter: number | null
}

export type PurchaseOrderDetail = {
  id: string
  documentNumber: string
  status: PurchaseOrderStatus
  supplierId: string
  supplierName: string
  warehouseId: string
  warehouseName: string
  orderedAt: string | null
  createdAt: string
  updatedAt: string
  subtotal: number
  total: number
  notes: string | null
  createdByName: string
  lines: PurchaseOrderLine[]
  receipts: PurchaseReceiptSummary[]
}

export type PurchaseOrderListFilters = {
  q?: string
  status?: PurchaseOrderStatus | "all"
  supplierId?: string
}

export type CreatePurchaseLineInput = {
  productVariantId: string
  quantityOrdered: number
  unitCost: number
}

export type CreatePurchaseInput = {
  supplierId: string
  warehouseId: string
  notes?: string | null
  lines: CreatePurchaseLineInput[]
}

export type ReceivePurchaseLineInput = {
  purchaseOrderItemId: string
  quantityReceived: number
  unitCost?: number
}

export type ReceivePurchaseInput = {
  purchaseOrderId: string
  notes?: string | null
  lines: ReceivePurchaseLineInput[]
  idempotencyKey?: string
}
