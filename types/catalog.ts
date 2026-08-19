import type { Database } from "@/lib/database.types"

export type ProductStatus = Database["public"]["Enums"]["product_status"]

export type CategoryOption = {
  id: string
  name: string
}

export type ProductVariantRow = {
  id: string
  name: string
  sku: string
  barcode: string | null
  costPrice: number | null
  salePrice: number | null
  reorderPoint: number
  isActive: boolean
}

export type ProductListItem = {
  id: string
  name: string
  status: ProductStatus
  categoryName: string | null
  variantCount: number
  primarySku: string | null
  primaryBarcode: string | null
  costPrice?: number
  salePrice: number
  unitOfMeasure: string
  updatedAt: string
}

export type ProductDetail = {
  id: string
  name: string
  description: string | null
  status: ProductStatus
  unitOfMeasure: string
  baseCostPrice?: number
  baseSalePrice: number
  canViewCost: boolean
  categoryId: string | null
  categoryName: string | null
  createdAt: string
  updatedAt: string
  variants: ProductVariantRow[]
}

export type ProductListFilters = {
  q?: string
  categoryId?: string
  status?: ProductStatus | "all"
}

export type CreateProductInput = {
  name: string
  description?: string | null
  categoryId?: string | null
  unitOfMeasure: string
  baseCostPrice: number
  baseSalePrice: number
  variant: {
    name: string
    sku: string
    barcode?: string | null
    costPrice?: number | null
    salePrice?: number | null
    reorderPoint: number
  }
}

export type UpdateProductInput = {
  name: string
  description?: string | null
  categoryId?: string | null
  unitOfMeasure: string
  baseCostPrice: number
  baseSalePrice: number
  variant: {
    id?: string
    name: string
    sku: string
    barcode?: string | null
    costPrice?: number | null
    salePrice?: number | null
    reorderPoint: number
  }
}
