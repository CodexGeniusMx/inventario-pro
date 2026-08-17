import type { Database } from "@/lib/database.types"

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock"
export type StockAdjustmentType =
  Database["public"]["Enums"]["stock_adjustment_type"]
export type MovementType = Database["public"]["Enums"]["movement_type"]

export type WarehouseRow = {
  id: string
  name: string
  code: string
  address: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type InventoryStatusItem = {
  productId: string
  productName: string
  productVariantId: string
  variantName: string
  sku: string
  barcode: string | null
  warehouseId: string
  warehouseName: string
  quantityOnHand: number
  reorderPoint: number
  stockStatus: StockStatus
  updatedAt: string
}

export type InventoryListFilters = {
  q?: string
  warehouseId?: string
  stockStatus?: StockStatus | "all"
}

export type MovementListItem = {
  id: string
  createdAt: string
  productName: string
  variantName: string
  sku: string
  warehouseId: string
  warehouseName: string
  movementType: MovementType
  quantity: number
  quantityBefore: number
  quantityAfter: number
  reason: string | null
  notes: string | null
  createdByName: string
  relatedDocumentLabel: string | null
  relatedDocumentHref: string | null
  stockAdjustmentId: string | null
  saleId: string | null
  purchaseReceiptId: string | null
  returnId: string | null
}

export type MovementListFilters = {
  q?: string
  warehouseId?: string
  movementType?: MovementType | "all"
}

export type AdjustmentListItem = {
  id: string
  documentNumber: string
  adjustmentType: StockAdjustmentType
  reason: string
  notes: string | null
  warehouseId: string
  warehouseName: string
  createdByName: string
  createdAt: string
  lineCount: number
}

export type AdjustmentLineItem = {
  id: string
  productVariantId: string
  productName: string
  variantName: string
  sku: string
  quantity: number
  movementId: string
  quantityBefore: number | null
  quantityAfter: number | null
  movementType: MovementType | null
}

export type AdjustmentDetail = {
  id: string
  documentNumber: string
  adjustmentType: StockAdjustmentType
  reason: string
  notes: string | null
  warehouseId: string
  warehouseName: string
  createdByName: string
  createdAt: string
  lines: AdjustmentLineItem[]
}

export type VariantOption = {
  id: string
  productName: string
  variantName: string
  sku: string
}

export type CreateWarehouseInput = {
  name: string
  code: string
  address?: string | null
  isDefault?: boolean
  isActive?: boolean
}

export type UpdateWarehouseInput = {
  name: string
  code: string
  address?: string | null
  isDefault?: boolean
  isActive?: boolean
}

export type CreateStockAdjustmentInput = {
  warehouseId: string
  adjustmentType: StockAdjustmentType
  reason: string
  notes?: string | null
  lines: Array<{
    productVariantId: string
    quantity: number
  }>
  idempotencyKey?: string
}

export type VariantBalance = {
  quantityOnHand: number
  reorderPoint: number
  stockStatus: StockStatus | null
}
