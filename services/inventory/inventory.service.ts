import type { PostgrestError } from "@supabase/supabase-js"

import type { Json } from "@/lib/database.types"

import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  ForbiddenError,
  InsufficientStockError,
  InventoryError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/app-error"
import { createClient } from "@/lib/supabase/server"
import type {
  AdjustmentDetail,
  AdjustmentListItem,
  CreateStockAdjustmentInput,
  InventoryListFilters,
  InventoryStatusItem,
  MovementListFilters,
  MovementListItem,
  StockStatus,
  VariantBalance,
  VariantOption,
} from "@/types/inventory"

function mapStockStatus(value: string | null): StockStatus {
  if (value === "low_stock" || value === "out_of_stock" || value === "in_stock") {
    return value
  }

  return "in_stock"
}

function mapInventoryStatus(row: {
  product_id: string | null
  product_name: string | null
  product_variant_id: string | null
  variant_name: string | null
  sku: string | null
  barcode: string | null
  warehouse_id: string | null
  warehouse_name: string | null
  quantity_on_hand: number | null
  reorder_point: number | null
  stock_status: string | null
  updated_at: string | null
}): InventoryStatusItem {
  return {
    productId: row.product_id ?? "",
    productName: row.product_name ?? "Unknown product",
    productVariantId: row.product_variant_id ?? "",
    variantName: row.variant_name ?? "Default",
    sku: row.sku ?? "—",
    barcode: row.barcode,
    warehouseId: row.warehouse_id ?? "",
    warehouseName: row.warehouse_name ?? "Unknown warehouse",
    quantityOnHand: row.quantity_on_hand ?? 0,
    reorderPoint: row.reorder_point ?? 0,
    stockStatus: mapStockStatus(row.stock_status),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

async function findVariantIdsForSearch(
  organizationId: string,
  query: string
): Promise<string[]> {
  const supabase = await createClient()
  const term = `%${query.trim()}%`

  const [productsResult, skuVariantsResult, barcodeVariantsResult] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, product_variants ( id )")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .ilike("name", term),
      supabase
        .from("product_variants")
        .select("id")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .ilike("sku", term),
      supabase
        .from("product_variants")
        .select("id")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .not("barcode", "is", null)
        .ilike("barcode", term),
    ])

  if (productsResult.error) {
    throw productsResult.error
  }

  if (skuVariantsResult.error) {
    throw skuVariantsResult.error
  }

  if (barcodeVariantsResult.error) {
    throw barcodeVariantsResult.error
  }

  const ids = new Set<string>()
  productsResult.data?.forEach((product) => {
    product.product_variants?.forEach((variant) => {
      if (variant?.id) {
        ids.add(variant.id)
      }
    })
  })
  skuVariantsResult.data?.forEach((variant) => ids.add(variant.id))
  barcodeVariantsResult.data?.forEach((variant) => ids.add(variant.id))

  return Array.from(ids)
}

export async function listInventoryStatus(
  user: AuthenticatedUser,
  filters: InventoryListFilters = {}
): Promise<InventoryStatusItem[]> {
  const supabase = await createClient()
  const stockStatus = filters.stockStatus ?? "all"

  let variantIds: string[] | null = null

  if (filters.q?.trim()) {
    variantIds = await findVariantIdsForSearch(user.organizationId, filters.q)

    const { data: nameMatches, error: nameError } = await supabase
      .from("v_inventory_status")
      .select("product_variant_id")
      .eq("organization_id", user.organizationId)
      .ilike("product_name", `%${filters.q.trim()}%`)

    if (nameError) {
      throw nameError
    }

    nameMatches?.forEach((row) => {
      if (row.product_variant_id) {
        variantIds!.push(row.product_variant_id)
      }
    })

    variantIds = Array.from(new Set(variantIds))

    if (variantIds.length === 0) {
      return []
    }
  }

  let query = supabase
    .from("v_inventory_status")
    .select("*")
    .eq("organization_id", user.organizationId)
    .order("product_name", { ascending: true })
    .order("variant_name", { ascending: true })

  if (variantIds) {
    query = query.in("product_variant_id", variantIds)
  }

  if (filters.warehouseId) {
    query = query.eq("warehouse_id", filters.warehouseId)
  }

  if (stockStatus !== "all") {
    query = query.eq("stock_status", stockStatus)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map(mapInventoryStatus)
}

export async function countLowStockItems(
  user: AuthenticatedUser
): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from("v_low_stock_items")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", user.organizationId)

  if (error) {
    throw error
  }

  return count ?? 0
}

function mapRelatedDocument(row: {
  stock_adjustment_id: string | null
  stock_adjustments?: { document_number: string } | null
  sale_id: string | null
  purchase_receipt_id: string | null
  return_id: string | null
}): { label: string | null; href: string | null } {
  if (row.stock_adjustment_id && row.stock_adjustments?.document_number) {
    return {
      label: row.stock_adjustments.document_number,
      href: `/inventory/adjustments/${row.stock_adjustment_id}`,
    }
  }

  if (row.sale_id) {
    return { label: "Sale", href: null }
  }

  if (row.purchase_receipt_id) {
    return { label: "Purchase receipt", href: null }
  }

  if (row.return_id) {
    return { label: "Return", href: null }
  }

  return { label: null, href: null }
}

export async function listMovements(
  user: AuthenticatedUser,
  filters: MovementListFilters = {}
): Promise<MovementListItem[]> {
  const supabase = await createClient()

  let variantIds: string[] | null = null

  if (filters.q?.trim()) {
    variantIds = await findVariantIdsForSearch(user.organizationId, filters.q)

    const { data: nameMatches, error: nameError } = await supabase
      .from("v_inventory_status")
      .select("product_variant_id")
      .eq("organization_id", user.organizationId)
      .ilike("product_name", `%${filters.q.trim()}%`)

    if (nameError) {
      throw nameError
    }

    nameMatches?.forEach((row) => {
      if (row.product_variant_id) {
        variantIds!.push(row.product_variant_id)
      }
    })

    variantIds = Array.from(new Set(variantIds))

    if (variantIds.length === 0) {
      return []
    }
  }

  let query = supabase
    .from("inventory_movements")
    .select(
      `
        id,
        created_at,
        warehouse_id,
        movement_type,
        quantity,
        quantity_before,
        quantity_after,
        reason,
        notes,
        stock_adjustment_id,
        sale_id,
        purchase_receipt_id,
        return_id,
        warehouses ( name ),
        product_variants (
          name,
          sku,
          products ( name )
        ),
        profiles!inventory_movements_created_by_fkey ( full_name ),
        stock_adjustments ( document_number )
      `
    )
    .eq("organization_id", user.organizationId)
    .order("created_at", { ascending: false })
    .limit(200)

  if (variantIds) {
    query = query.in("product_variant_id", variantIds)
  }

  if (filters.warehouseId) {
    query = query.eq("warehouse_id", filters.warehouseId)
  }

  if (filters.movementType && filters.movementType !== "all") {
    query = query.eq("movement_type", filters.movementType)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => {
    const related = mapRelatedDocument(row)

    return {
      id: row.id,
      createdAt: row.created_at,
      productName: row.product_variants?.products?.name ?? "Unknown product",
      variantName: row.product_variants?.name ?? "Default",
      sku: row.product_variants?.sku ?? "—",
      warehouseId: row.warehouse_id,
      warehouseName: row.warehouses?.name ?? "Unknown warehouse",
      movementType: row.movement_type,
      quantity: row.quantity,
      quantityBefore: row.quantity_before,
      quantityAfter: row.quantity_after,
      reason: row.reason,
      notes: row.notes,
      createdByName: row.profiles?.full_name ?? "Unknown user",
      relatedDocumentLabel: related.label,
      relatedDocumentHref: related.href,
      stockAdjustmentId: row.stock_adjustment_id,
      saleId: row.sale_id,
      purchaseReceiptId: row.purchase_receipt_id,
      returnId: row.return_id,
    }
  })
}

export async function listAdjustments(
  user: AuthenticatedUser
): Promise<AdjustmentListItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("stock_adjustments")
    .select(
      `
        id,
        document_number,
        adjustment_type,
        reason,
        notes,
        warehouse_id,
        created_at,
        warehouses ( name ),
        profiles!stock_adjustments_created_by_fkey ( full_name ),
        stock_adjustment_items ( id )
      `
    )
    .eq("organization_id", user.organizationId)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    documentNumber: row.document_number,
    adjustmentType: row.adjustment_type,
    reason: row.reason,
    notes: row.notes,
    warehouseId: row.warehouse_id,
    warehouseName: row.warehouses?.name ?? "Unknown warehouse",
    createdByName: row.profiles?.full_name ?? "Unknown user",
    createdAt: row.created_at,
    lineCount: row.stock_adjustment_items?.length ?? 0,
  }))
}

export async function getAdjustmentById(
  user: AuthenticatedUser,
  adjustmentId: string
): Promise<AdjustmentDetail> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("stock_adjustments")
    .select(
      `
        id,
        document_number,
        adjustment_type,
        reason,
        notes,
        warehouse_id,
        created_at,
        warehouses ( name ),
        profiles!stock_adjustments_created_by_fkey ( full_name ),
        stock_adjustment_items (
          id,
          product_variant_id,
          quantity,
          movement_id,
          product_variants (
            name,
            sku,
            products ( name )
          ),
          inventory_movements!stock_adjustment_items_movement_id_fkey (
            movement_type,
            quantity_before,
            quantity_after
          )
        )
      `
    )
    .eq("id", adjustmentId)
    .eq("organization_id", user.organizationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Stock adjustment not found.")
  }

  return {
    id: data.id,
    documentNumber: data.document_number,
    adjustmentType: data.adjustment_type,
    reason: data.reason,
    notes: data.notes,
    warehouseId: data.warehouse_id,
    warehouseName: data.warehouses?.name ?? "Unknown warehouse",
    createdByName: data.profiles?.full_name ?? "Unknown user",
    createdAt: data.created_at,
    lines: (data.stock_adjustment_items ?? []).map((line) => ({
      id: line.id,
      productVariantId: line.product_variant_id,
      productName: line.product_variants?.products?.name ?? "Unknown product",
      variantName: line.product_variants?.name ?? "Default",
      sku: line.product_variants?.sku ?? "—",
      quantity: line.quantity,
      movementId: line.movement_id,
      quantityBefore: line.inventory_movements?.quantity_before ?? null,
      quantityAfter: line.inventory_movements?.quantity_after ?? null,
      movementType: line.inventory_movements?.movement_type ?? null,
    })),
  }
}

export async function listVariantOptions(
  user: AuthenticatedUser
): Promise<VariantOption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("product_variants")
    .select(
      `
        id,
        name,
        sku,
        products!inner ( name, status, deleted_at )
      `
    )
    .eq("organization_id", user.organizationId)
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("sku", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? [])
    .filter((variant) => !variant.products?.deleted_at)
    .filter((variant) => variant.products?.status === "active")
    .map((variant) => ({
      id: variant.id,
      productName: variant.products?.name ?? "Unknown product",
      variantName: variant.name,
      sku: variant.sku,
    }))
}

export async function getVariantBalance(
  user: AuthenticatedUser,
  warehouseId: string,
  productVariantId: string
): Promise<VariantBalance> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("v_inventory_status")
    .select("quantity_on_hand, reorder_point, stock_status")
    .eq("organization_id", user.organizationId)
    .eq("warehouse_id", warehouseId)
    .eq("product_variant_id", productVariantId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return {
      quantityOnHand: 0,
      reorderPoint: 0,
      stockStatus: null,
    }
  }

  return {
    quantityOnHand: data.quantity_on_hand ?? 0,
    reorderPoint: data.reorder_point ?? 0,
    stockStatus: data.stock_status
      ? mapStockStatus(data.stock_status)
      : null,
  }
}

function mapRpcError(error: PostgrestError): never {
  const message = error.message.toLowerCase()
  const details = error.details?.toLowerCase() ?? ""

  if (message.includes("insufficient_stock") || details.includes("insufficient_stock")) {
    throw new InsufficientStockError()
  }

  if (message.includes("permission_denied")) {
    throw new ForbiddenError()
  }

  if (
    message.includes("reason_required") ||
    message.includes("invalid_line_quantity")
  ) {
    throw new ValidationError("Please check the adjustment details and try again.")
  }

  if (message.includes("organization_mismatch")) {
    throw new ForbiddenError()
  }

  throw new InventoryError(error.message)
}

export async function createStockAdjustment(
  user: AuthenticatedUser,
  input: CreateStockAdjustmentInput
): Promise<{ id: string }> {
  const supabase = await createClient()

  const lines = input.lines.map((line) => ({
    product_variant_id: line.productVariantId,
    quantity: line.quantity,
  }))

  const { data, error } = await supabase.rpc("create_stock_adjustment", {
    p_organization_id: user.organizationId,
    p_warehouse_id: input.warehouseId,
    p_adjustment_type: input.adjustmentType,
    p_reason: input.reason,
    p_created_by: user.id,
    p_lines: lines as Json,
    p_notes: input.notes ?? undefined,
    p_idempotency_key: input.idempotencyKey ?? undefined,
  })

  if (error) {
    mapRpcError(error)
  }

  if (!data) {
    throw new InventoryError("Adjustment was not created.")
  }

  const adjustment = await getAdjustmentById(user, data)

  if (adjustment.lines.length === 0) {
    throw new InventoryError(
      "Adjustment was saved without inventory movement lines."
    )
  }

  const missingMovement = adjustment.lines.some(
    (line) => !line.movementId || line.quantityBefore === null || line.quantityAfter === null
  )

  if (missingMovement) {
    throw new InventoryError(
      "Adjustment completed without a linked inventory movement record."
    )
  }

  return { id: data }
}
