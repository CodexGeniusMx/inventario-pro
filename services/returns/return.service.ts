import type { PostgrestError } from "@supabase/supabase-js"

import type { Json } from "@/lib/database.types"

import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/app-error"
import type { ProcessReturnRpcArgs } from "@/lib/returns/rpc"
import { createClient } from "@/lib/supabase/server"
import type {
  ProcessReturnInput,
  ReturnDetail,
  ReturnListFilters,
  ReturnListItem,
  SaleReturnContext,
} from "@/types/returns"

function mapRpcError(error: PostgrestError): never {
  const message = error.message.toLowerCase()
  const details = error.details?.toLowerCase() ?? ""

  if (message.includes("permission_denied")) {
    throw new ForbiddenError()
  }

  if (message.includes("organization_mismatch")) {
    throw new ForbiddenError()
  }

  if (
    message.includes("excess_return_quantity") ||
    message.includes("invalid_line_quantity") ||
    message.includes("lines_required") ||
    message.includes("reason_required")
  ) {
    throw new ValidationError("La cantidad o los detalles de la devolución no son válidos.")
  }

  if (
    message.includes("invalid_sale") ||
    message.includes("invalid_sale_status") ||
    message.includes("invalid_line_item") ||
    message.includes("invalid_warehouse")
  ) {
    throw new ValidationError("Esta venta no se puede devolver.")
  }

  if (
    message.includes("could not find the function") ||
    error.code === "PGRST202"
  ) {
    throw new ConflictError(
      "El procesamiento de devoluciones no está disponible. Aplica las últimas migraciones de base de datos."
    )
  }

  throw error
}

export async function listReturns(
  user: AuthenticatedUser,
  filters: ReturnListFilters = {}
): Promise<ReturnListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from("returns")
    .select(
      `
        id,
        document_number,
        sale_id,
        reason,
        created_at,
        sales ( document_number ),
        warehouses ( name ),
        profiles!returns_created_by_fkey ( full_name ),
        return_items ( quantity )
      `
    )
    .eq("organization_id", user.organizationId)
    .order("created_at", { ascending: false })

  if (filters.q?.trim()) {
    query = query.ilike("document_number", `%${filters.q.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => {
    const items = row.return_items ?? []
    const totalQuantity = items.reduce(
      (sum, item) => sum + item.quantity,
      0
    )

    return {
      id: row.id,
      documentNumber: row.document_number,
      saleId: row.sale_id,
      saleDocumentNumber: row.sales?.document_number ?? "Venta desconocida",
      warehouseName: row.warehouses?.name ?? "Almacén desconocido",
      reason: row.reason ?? "—",
      itemCount: items.length,
      totalQuantity,
      createdAt: row.created_at,
      createdByName: row.profiles?.full_name ?? "Usuario desconocido",
    }
  })
}

export async function getReturnById(
  user: AuthenticatedUser,
  returnId: string
): Promise<ReturnDetail> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("returns")
    .select(
      `
        id,
        document_number,
        sale_id,
        warehouse_id,
        reason,
        notes,
        created_at,
        sales ( document_number ),
        warehouses ( name ),
        profiles!returns_created_by_fkey ( full_name ),
        return_items (
          id,
          sale_item_id,
          product_variant_id,
          quantity,
          is_restockable,
          restock_movement_id,
          damage_movement_id,
          product_variants (
            name,
            sku,
            products ( name )
          ),
          inventory_movements!return_items_restock_movement_id_fkey (
            quantity_before,
            quantity_after
          )
        )
      `
    )
    .eq("id", returnId)
    .eq("organization_id", user.organizationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Devolución no encontrada.")
  }

  return {
    id: data.id,
    documentNumber: data.document_number,
    saleId: data.sale_id,
    saleDocumentNumber: data.sales?.document_number ?? "Venta desconocida",
    warehouseId: data.warehouse_id,
    warehouseName: data.warehouses?.name ?? "Almacén desconocido",
    reason: data.reason ?? "—",
    notes: data.notes,
    createdAt: data.created_at,
    createdByName: data.profiles?.full_name ?? "Usuario desconocido",
    lines: (data.return_items ?? []).map((line) => {
      const restockMovement = Array.isArray(line.inventory_movements)
        ? line.inventory_movements[0]
        : line.inventory_movements

      return {
        id: line.id,
        saleItemId: line.sale_item_id,
        productVariantId: line.product_variant_id,
        productName: line.product_variants?.products?.name ?? "Producto desconocido",
        variantName: line.product_variants?.name ?? "Default",
        sku: line.product_variants?.sku ?? "—",
        quantity: line.quantity,
        isRestockable: line.is_restockable,
        quantityBefore: restockMovement?.quantity_before ?? null,
        quantityAfter: restockMovement?.quantity_after ?? null,
        restockMovementId: line.restock_movement_id,
        damageMovementId: line.damage_movement_id,
      }
    }),
  }
}

export async function getSaleReturnContext(
  user: AuthenticatedUser,
  saleId: string
): Promise<SaleReturnContext> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
        id,
        document_number,
        status,
        warehouse_id,
        customers ( name ),
        warehouses ( name ),
        sale_items (
          id,
          product_variant_id,
          quantity,
          quantity_returned,
          unit_price,
          product_variants (
            name,
            sku,
            products ( name )
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

  if (data.status !== "completed" && data.status !== "partially_returned") {
    throw new ValidationError("Solo las ventas completadas se pueden devolver.")
  }

  const lines = (data.sale_items ?? [])
    .map((line) => ({
      id: line.id,
      productVariantId: line.product_variant_id,
      productName: line.product_variants?.products?.name ?? "Producto desconocido",
      variantName: line.product_variants?.name ?? "Default",
      sku: line.product_variants?.sku ?? "—",
      quantitySold: line.quantity,
      quantityReturned: line.quantity_returned,
      quantityReturnable: line.quantity - line.quantity_returned,
      unitPrice: Number(line.unit_price),
    }))
    .filter((line) => line.quantityReturnable > 0)

  return {
    id: data.id,
    documentNumber: data.document_number,
    status: data.status,
    warehouseId: data.warehouse_id,
    warehouseName: data.warehouses?.name ?? "Almacén desconocido",
    customerName: data.customers?.name ?? null,
    lines,
  }
}

export async function listReturnableSales(
  user: AuthenticatedUser
): Promise<
  Array<{
    id: string
    documentNumber: string
    customerName: string | null
    completedAt: string | null
    returnableLineCount: number
  }>
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
        id,
        document_number,
        completed_at,
        customers ( name ),
        sale_items ( quantity, quantity_returned )
      `
    )
    .eq("organization_id", user.organizationId)
    .in("status", ["completed", "partially_returned"])
    .order("completed_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? [])
    .map((sale) => {
      const returnableLineCount = (sale.sale_items ?? []).filter(
        (line) => line.quantity_returned < line.quantity
      ).length

      return {
        id: sale.id,
        documentNumber: sale.document_number,
        customerName: sale.customers?.name ?? null,
        completedAt: sale.completed_at,
        returnableLineCount,
      }
    })
    .filter((sale) => sale.returnableLineCount > 0)
}

export async function processReturn(
  user: AuthenticatedUser,
  input: ProcessReturnInput
): Promise<{ id: string }> {
  const supabase = await createClient()

  const lines = input.lines.map((line) => ({
    sale_item_id: line.saleItemId,
    quantity: line.quantity,
    is_restockable: line.isRestockable ?? true,
  }))

  const rpcArgs: ProcessReturnRpcArgs = {
    p_organization_id: user.organizationId,
    p_sale_id: input.saleId,
    p_created_by: user.id,
    p_lines: lines as Json,
    p_reason: input.reason,
  }

  if (input.notes) {
    rpcArgs.p_notes = input.notes
  }

  if (input.idempotencyKey) {
    rpcArgs.p_idempotency_key = input.idempotencyKey
  }

  const { data, error } = await supabase.rpc("process_return", rpcArgs)

  if (error) {
    mapRpcError(error)
  }

  if (!data) {
    throw new ConflictError("La devolución no fue creada.")
  }

  return { id: data as string }
}
