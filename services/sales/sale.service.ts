import type { PostgrestError } from "@supabase/supabase-js"

import type { Json } from "@/lib/database.types"

import type { AuthenticatedUser } from "@/lib/auth/types"
import { resolveCostPrice, resolveSalePrice } from "@/lib/catalog/pricing"
import {
  ConflictError,
  ForbiddenError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/app-error"
import type { CreateAndCompleteSaleRpcArgs } from "@/lib/sales/rpc"
import { createClient } from "@/lib/supabase/server"
import type {
  CreateSaleInput,
  SaleDetail,
  SaleListFilters,
  SaleListItem,
  SaleStatus,
  VariantSalePrice,
} from "@/types/sales"

function mapSaleStatus(value: string): SaleStatus {
  if (
    value === "draft" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "partially_returned" ||
    value === "fully_returned"
  ) {
    return value
  }

  return "draft"
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

  if (message.includes("organization_mismatch")) {
    throw new ForbiddenError()
  }

  if (
    message.includes("invalid_line_quantity") ||
    message.includes("lines_required") ||
    message.includes("invalid_discount_amount") ||
    message.includes("invalid_line_price")
  ) {
    throw new ValidationError("Revisa los detalles de la venta e inténtalo de nuevo.")
  }

  if (
    message.includes("invalid_line_variant") ||
    message.includes("invalid_warehouse") ||
    message.includes("invalid_customer")
  ) {
    throw new ValidationError("Uno o más detalles de la venta no son válidos.")
  }

  if (
    message.includes("could not find the function") ||
    error.code === "PGRST202"
  ) {
    throw new ConflictError(
      "La finalización de ventas no está disponible. Aplica las últimas migraciones de base de datos."
    )
  }

  throw error
}

export async function listSales(
  user: AuthenticatedUser,
  filters: SaleListFilters = {}
): Promise<SaleListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from("sales")
    .select(
      `
        id,
        document_number,
        status,
        customer_id,
        warehouse_id,
        completed_at,
        created_at,
        total,
        customers ( name ),
        warehouses ( name ),
        profiles!sales_created_by_fkey ( full_name ),
        sale_items ( id )
      `
    )
    .eq("organization_id", user.organizationId)
    .order("created_at", { ascending: false })

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`
    query = query.ilike("document_number", term)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    documentNumber: row.document_number,
    status: mapSaleStatus(row.status),
    customerId: row.customer_id,
    customerName: row.customers?.name ?? null,
    warehouseId: row.warehouse_id,
    warehouseName: row.warehouses?.name ?? "Almacén desconocido",
    completedAt: row.completed_at,
    createdAt: row.created_at,
    total: Number(row.total),
    itemCount: row.sale_items?.length ?? 0,
    createdByName: row.profiles?.full_name ?? "Usuario desconocido",
  }))
}

export async function getSaleById(
  user: AuthenticatedUser,
  saleId: string
): Promise<SaleDetail> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
        id,
        document_number,
        status,
        customer_id,
        warehouse_id,
        subtotal,
        discount_amount,
        total,
        completed_at,
        created_at,
        notes,
        customers ( name ),
        warehouses ( name ),
        profiles!sales_created_by_fkey ( full_name ),
        sale_items (
          id,
          product_variant_id,
          quantity,
          quantity_returned,
          unit_price,
          line_total,
          movement_id,
          product_variants (
            name,
            sku,
            products ( name )
          ),
          inventory_movements!sale_items_movement_id_fkey (
            quantity_before,
            quantity_after
          )
        )
      `
    )
    .eq("id", saleId)
    .eq("organization_id", user.organizationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Venta no encontrada.")
  }

  return {
    id: data.id,
    documentNumber: data.document_number,
    status: mapSaleStatus(data.status),
    customerId: data.customer_id,
    customerName: data.customers?.name ?? null,
    warehouseId: data.warehouse_id,
    warehouseName: data.warehouses?.name ?? "Almacén desconocido",
    subtotal: Number(data.subtotal),
    discountAmount: Number(data.discount_amount),
    total: Number(data.total),
    completedAt: data.completed_at,
    createdAt: data.created_at,
    createdByName: data.profiles?.full_name ?? "Usuario desconocido",
    notes: data.notes ?? null,
    lines: (data.sale_items ?? []).map((line) => ({
      id: line.id,
      productVariantId: line.product_variant_id,
      productName: line.product_variants?.products?.name ?? "Producto desconocido",
      variantName: line.product_variants?.name ?? "Default",
      sku: line.product_variants?.sku ?? "—",
      quantity: line.quantity,
      quantityReturned: line.quantity_returned,
      unitPrice: Number(line.unit_price),
      lineTotal: Number(line.line_total),
      movementId: line.movement_id,
      quantityBefore: line.inventory_movements?.quantity_before ?? null,
      quantityAfter: line.inventory_movements?.quantity_after ?? null,
    })),
  }
}

export async function getVariantSalePrices(
  user: AuthenticatedUser,
  variantIds: string[]
): Promise<VariantSalePrice[]> {
  const supabase = await createClient()
  const uniqueIds = Array.from(new Set(variantIds))

  if (uniqueIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from("product_variants")
    .select(
      `
        id,
        sale_price,
        cost_price,
        products!inner ( base_sale_price, base_cost_price, status, deleted_at )
      `
    )
    .eq("organization_id", user.organizationId)
    .in("id", uniqueIds)
    .is("deleted_at", null)
    .eq("is_active", true)

  if (error) {
    throw error
  }

  return (data ?? [])
    .filter(
      (variant) =>
        !variant.products?.deleted_at && variant.products?.status === "active"
    )
    .map((variant) => ({
      productVariantId: variant.id,
      unitPrice: resolveSalePrice(
        variant.sale_price,
        variant.products?.base_sale_price
      ),
      unitCost: resolveCostPrice(
        variant.cost_price,
        variant.products?.base_cost_price
      ),
    }))
}

export async function createAndCompleteSale(
  user: AuthenticatedUser,
  input: CreateSaleInput
): Promise<{ id: string }> {
  const supabase = await createClient()

  const lines = input.lines.map((line) => ({
    product_variant_id: line.productVariantId,
    quantity: line.quantity,
  }))

  const rpcArgs: CreateAndCompleteSaleRpcArgs = {
    p_organization_id: user.organizationId,
    p_warehouse_id: input.warehouseId,
    p_created_by: user.id,
    p_lines: lines as Json,
    p_discount_amount: input.discountAmount ?? 0,
  }

  if (input.customerId) {
    rpcArgs.p_customer_id = input.customerId
  }

  if (input.idempotencyKey) {
    rpcArgs.p_idempotency_key = input.idempotencyKey
  }

  if (input.notes) {
    rpcArgs.p_notes = input.notes
  }

  const { data, error } = await supabase.rpc(
    "create_and_complete_sale" as "create_stock_adjustment",
    rpcArgs as never
  )

  if (error) {
    mapRpcError(error)
  }

  if (!data) {
    throw new ConflictError("La venta no fue creada.")
  }

  const sale = await getSaleById(user, data)

  if (sale.status !== "completed") {
    throw new ConflictError("La venta no se completó correctamente.")
  }

  const missingMovement = sale.lines.some(
    (line) =>
      !line.movementId ||
      line.quantityBefore === null ||
      line.quantityAfter === null
  )

  if (missingMovement) {
    throw new ConflictError(
      "Venta completada sin registros de movimiento de inventario vinculados."
    )
  }

  return { id: data }
}
