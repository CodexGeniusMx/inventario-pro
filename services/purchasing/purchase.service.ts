import type { PostgrestError } from "@supabase/supabase-js"

import type { Json } from "@/lib/database.types"

import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  isSupportedCurrency,
  resolveTransactionCurrency,
} from "@/lib/currency/types"
import { isMissingSchemaError } from "@/lib/auth/redirect-log"
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/app-error"
import type { ReceivePurchaseRpcArgs } from "@/lib/purchasing/rpc"
import { createClient } from "@/lib/supabase/server"
import type {
  CreatePurchaseInput,
  PurchaseOrderDetail,
  PurchaseOrderListFilters,
  PurchaseOrderListItem,
  PurchaseOrderStatus,
  ReceivePurchaseInput,
} from "@/types/purchasing"

function mapPurchaseOrderStatus(value: string): PurchaseOrderStatus {
  if (
    value === "draft" ||
    value === "ordered" ||
    value === "partially_received" ||
    value === "received" ||
    value === "cancelled"
  ) {
    return value
  }

  return "draft"
}

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
    message.includes("over_receipt") ||
    details.includes("over_receipt")
  ) {
    throw new ValidationError(
      "No se puede recibir más que la cantidad ordenada restante."
    )
  }

  if (message.includes("invalid_purchase_status")) {
    throw new ConflictError(
      "Esta orden de compra no se puede recibir en su estado actual."
    )
  }

  if (message.includes("purchase_order_not_found")) {
    throw new NotFoundError("Orden de compra no encontrada.")
  }

  if (
    message.includes("invalid_line_quantity") ||
    message.includes("lines_required") ||
    message.includes("invalid_unit_cost")
  ) {
    throw new ValidationError("Revisa las cantidades de recepción e inténtalo de nuevo.")
  }

  if (
    message.includes("invalid_purchase_order_item") ||
    message.includes("invalid_line_variant")
  ) {
    throw new ValidationError("Una o más líneas de compra no son válidas.")
  }

  if (message.includes("inventory_movements are immutable")) {
    throw new ConflictError(
      "La recepción de compra no pudo vincularse a movimientos de inventario."
    )
  }

  if (
    message.includes("could not find the function") ||
    error.code === "PGRST202"
  ) {
    throw new ConflictError(
      "La recepción de compras no está disponible. Aplica las últimas migraciones de base de datos."
    )
  }

  throw error
}

async function validateSupplier(
  organizationId: string,
  supplierId: string
): Promise<void> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", supplierId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Proveedor no encontrado o inactivo.")
  }
}

async function validateWarehouse(
  organizationId: string,
  warehouseId: string
): Promise<void> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("warehouses")
    .select("id")
    .eq("id", warehouseId)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Almacén no encontrado o inactivo.")
  }
}

async function validateVariants(
  organizationId: string,
  variantIds: string[]
): Promise<void> {
  const supabase = await createClient()
  const uniqueIds = Array.from(new Set(variantIds))

  const { data, error } = await supabase
    .from("product_variants")
    .select(
      `
        id,
        products!inner ( status, deleted_at )
      `
    )
    .eq("organization_id", organizationId)
    .in("id", uniqueIds)
    .is("deleted_at", null)
    .eq("is_active", true)

  if (error) {
    throw error
  }

  const validIds = new Set(
    (data ?? [])
      .filter(
        (variant) =>
          !variant.products?.deleted_at && variant.products?.status === "active"
      )
      .map((variant) => variant.id)
  )

  if (validIds.size !== uniqueIds.length) {
    throw new NotFoundError("Una o más variantes de producto no son válidas.")
  }
}

export async function listPurchaseOrders(
  user: AuthenticatedUser,
  filters: PurchaseOrderListFilters = {}
): Promise<PurchaseOrderListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from("purchase_orders")
    .select(
      `
        id,
        document_number,
        status,
        supplier_id,
        warehouse_id,
        ordered_at,
        created_at,
        total,
        suppliers ( name ),
        warehouses ( name ),
        profiles!purchase_orders_created_by_fkey ( full_name ),
        purchase_order_items ( quantity_ordered, quantity_received )
      `
    )
    .eq("organization_id", user.organizationId)
    .order("created_at", { ascending: false })

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  if (filters.supplierId) {
    query = query.eq("supplier_id", filters.supplierId)
  }

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`
    query = query.or(`document_number.ilike.${term},notes.ilike.${term}`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => {
    const items = row.purchase_order_items ?? []
    const quantityOrdered = items.reduce(
      (sum, item) => sum + (item.quantity_ordered ?? 0),
      0
    )
    const quantityReceived = items.reduce(
      (sum, item) => sum + (item.quantity_received ?? 0),
      0
    )

    return {
      id: row.id,
      documentNumber: row.document_number,
      status: mapPurchaseOrderStatus(row.status),
      supplierId: row.supplier_id,
      supplierName: row.suppliers?.name ?? "Proveedor desconocido",
      warehouseId: row.warehouse_id,
      warehouseName: row.warehouses?.name ?? "Almacén desconocido",
      orderedAt: row.ordered_at,
      createdAt: row.created_at,
      total: Number(row.total),
      currencyCode: user.organizationBaseCurrency,
      quantityOrdered,
      quantityReceived,
      createdByName: row.profiles?.full_name ?? "Usuario desconocido",
    }
  })
}

export async function getPurchaseOrderById(
  user: AuthenticatedUser,
  purchaseOrderId: string
): Promise<PurchaseOrderDetail> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      `
        id,
        document_number,
        status,
        supplier_id,
        warehouse_id,
        ordered_at,
        created_at,
        updated_at,
        subtotal,
        total,
        notes,
        suppliers ( name ),
        warehouses ( name ),
        profiles!purchase_orders_created_by_fkey ( full_name ),
        purchase_order_items (
          id,
          product_variant_id,
          quantity_ordered,
          quantity_received,
          unit_cost,
          line_total,
          product_variants (
            name,
            sku,
            products ( name )
          )
        ),
        purchase_receipts (
          id,
          document_number,
          received_at,
          notes,
          profiles!purchase_receipts_created_by_fkey ( full_name ),
          purchase_receipt_items (
            id,
            quantity_received,
            unit_cost,
            movement_id,
            product_variants (
              name,
              sku,
              products ( name )
            ),
            inventory_movements!purchase_receipt_items_movement_id_fkey (
              quantity_before,
              quantity_after
            )
          )
        )
      `
    )
    .eq("id", purchaseOrderId)
    .eq("organization_id", user.organizationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Orden de compra no encontrada.")
  }

  return {
    id: data.id,
    documentNumber: data.document_number,
    status: mapPurchaseOrderStatus(data.status),
    supplierId: data.supplier_id,
    supplierName: data.suppliers?.name ?? "Proveedor desconocido",
    warehouseId: data.warehouse_id,
    warehouseName: data.warehouses?.name ?? "Almacén desconocido",
    orderedAt: data.ordered_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    subtotal: Number(data.subtotal),
    total: Number(data.total),
    currencyCode: user.organizationBaseCurrency,
    notes: data.notes,
    createdByName: data.profiles?.full_name ?? "Usuario desconocido",
    lines: (data.purchase_order_items ?? []).map((line) => ({
      id: line.id,
      productVariantId: line.product_variant_id,
      productName: line.product_variants?.products?.name ?? "Producto desconocido",
      variantName: line.product_variants?.name ?? "Default",
      sku: line.product_variants?.sku ?? "—",
      quantityOrdered: line.quantity_ordered,
      quantityReceived: line.quantity_received,
      quantityRemaining: line.quantity_ordered - line.quantity_received,
      unitCost: Number(line.unit_cost),
      lineTotal: Number(line.line_total),
    })),
    receipts: (data.purchase_receipts ?? [])
      .sort(
        (a, b) =>
          new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
      )
      .map((receipt) => ({
        id: receipt.id,
        documentNumber: receipt.document_number,
        receivedAt: receipt.received_at,
        createdByName: receipt.profiles?.full_name ?? "Usuario desconocido",
        notes: receipt.notes,
        lines: (receipt.purchase_receipt_items ?? []).map((item) => ({
          id: item.id,
          productName: item.product_variants?.products?.name ?? "Producto desconocido",
          variantName: item.product_variants?.name ?? "Default",
          sku: item.product_variants?.sku ?? "—",
          quantityReceived: item.quantity_received,
          unitCost: Number(item.unit_cost),
          movementId: item.movement_id,
          quantityBefore:
            item.inventory_movements?.quantity_before ?? null,
          quantityAfter: item.inventory_movements?.quantity_after ?? null,
        })),
      })),
  }
}

export async function createPurchaseOrder(
  user: AuthenticatedUser,
  input: CreatePurchaseInput
): Promise<{ id: string }> {
  const supabase = await createClient()
  const organizationId = user.organizationId

  await validateSupplier(organizationId, input.supplierId)
  await validateWarehouse(organizationId, input.warehouseId)
  await validateVariants(
    organizationId,
    input.lines.map((line) => line.productVariantId)
  )

  const { data: documentNumber, error: docError } = await supabase.rpc(
    "next_document_number",
    {
      p_organization_id: organizationId,
      p_document_kind: "purchase_order",
    }
  )

  if (docError) {
    throw docError
  }

  if (!documentNumber) {
    throw new ConflictError("No se pudo generar el número de orden de compra.")
  }

  const lines = input.lines.map((line) => {
    const lineTotal = Math.round(line.quantityOrdered * line.unitCost * 100) / 100
    return {
      productVariantId: line.productVariantId,
      quantityOrdered: line.quantityOrdered,
      unitCost: line.unitCost,
      lineTotal,
    }
  })

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const total = subtotal

  const currencyCode = resolveTransactionCurrency(
    user.organizationAllowedCurrencies,
    input.currencyCode
  )

  const insertBase = {
    organization_id: organizationId,
    supplier_id: input.supplierId,
    warehouse_id: input.warehouseId,
    document_number: documentNumber,
    status: "ordered" as const,
    ordered_at: new Date().toISOString(),
    notes: input.notes ?? null,
    subtotal,
    total,
    created_by: user.id,
  }

  let purchaseOrder: { id: string } | null = null
  let poError: PostgrestError | null = null

  const withCurrency = await supabase
    .from("purchase_orders")
    .insert({ ...insertBase, currency_code: currencyCode })
    .select("id")
    .single()

  purchaseOrder = withCurrency.data
  poError = withCurrency.error

  if (poError && isMissingSchemaError(poError)) {
    const withoutCurrency = await supabase
      .from("purchase_orders")
      .insert(insertBase)
      .select("id")
      .single()

    purchaseOrder = withoutCurrency.data
    poError = withoutCurrency.error
  }

  if (poError) {
    throw poError
  }

  if (!purchaseOrder) {
    throw new ConflictError("No se pudo crear la orden de compra.")
  }

  const { error: itemsError } = await supabase.from("purchase_order_items").insert(
    lines.map((line) => ({
      purchase_order_id: purchaseOrder.id,
      product_variant_id: line.productVariantId,
      quantity_ordered: line.quantityOrdered,
      quantity_received: 0,
      unit_cost: line.unitCost,
      line_total: line.lineTotal,
    }))
  )

  if (itemsError) {
    await supabase.from("purchase_orders").delete().eq("id", purchaseOrder.id)
    throw itemsError
  }

  return { id: purchaseOrder.id }
}

export async function receivePurchaseOrder(
  user: AuthenticatedUser,
  input: ReceivePurchaseInput
): Promise<{ receiptId: string }> {
  const supabase = await createClient()

  const lines = input.lines.map((line) => ({
    purchase_order_item_id: line.purchaseOrderItemId,
    quantity_received: line.quantityReceived,
    ...(line.unitCost !== undefined ? { unit_cost: line.unitCost } : {}),
  }))

  const { data, error } = await supabase.rpc(
    "receive_purchase" as "create_stock_adjustment",
    {
      p_organization_id: user.organizationId,
      p_purchase_order_id: input.purchaseOrderId,
      p_created_by: user.id,
      p_lines: lines as Json,
      p_notes: input.notes ?? undefined,
      p_idempotency_key: input.idempotencyKey ?? undefined,
    } as ReceivePurchaseRpcArgs as never
  )

  if (error) {
    mapRpcError(error)
  }

  if (!data) {
    throw new ConflictError("La recepción de compra no fue creada.")
  }

  const purchaseOrder = await getPurchaseOrderById(user, input.purchaseOrderId)
  const receipt = purchaseOrder.receipts.find((item) => item.id === data)

  if (!receipt) {
    throw new ConflictError(
      "La recepción fue creada pero no pudo verificarse."
    )
  }

  const missingMovement = receipt.lines.some(
    (line) =>
      !line.movementId ||
      line.quantityBefore === null ||
      line.quantityAfter === null
  )

  if (missingMovement) {
    throw new ConflictError(
      "Recepción completada sin registros de movimiento de inventario vinculados."
    )
  }

  return { receiptId: data }
}
