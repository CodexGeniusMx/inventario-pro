import type { PostgrestError } from "@supabase/supabase-js"

import type { Json } from "@/lib/database.types"

import type { AuthenticatedUser } from "@/lib/auth/types"
import { canViewPurchaseFinancials } from "@/lib/auth/financial-data"
import {
  resolveTransactionCurrency,
} from "@/lib/currency/types"
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/app-error"
import type { ReceivePurchaseRpcArgs, CreatePurchaseOrderRpcArgs } from "@/lib/purchasing/rpc"
import { READ } from "@/lib/db/read-models"
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
      "La operación de compras no está disponible. Aplica las últimas migraciones de base de datos."
    )
  }

  if (message.includes("invalid_supplier")) {
    throw new NotFoundError("Proveedor no encontrado o inactivo.")
  }

  if (message.includes("invalid_warehouse")) {
    throw new NotFoundError("Almacén no encontrado o inactivo.")
  }

  if (message.includes("unsupported_currency")) {
    throw new ValidationError("La moneda seleccionada no está permitida.")
  }

  throw error
}

export async function listPurchaseOrders(
  user: AuthenticatedUser,
  filters: PurchaseOrderListFilters = {}
): Promise<PurchaseOrderListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from(READ.purchaseOrders)
    .select(
      "id, document_number, status, supplier_id, warehouse_id, ordered_at, created_at, total, created_by"
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

  const orderRows = (data ?? []).filter(
    (row): row is (typeof data)[number] & { id: string } => Boolean(row.id)
  )
  const orderIds = orderRows.map((row) => row.id)
  const supplierIds = Array.from(
    new Set(orderRows.map((row) => row.supplier_id).filter((id): id is string => Boolean(id)))
  )
  const warehouseIds = Array.from(
    new Set(orderRows.map((row) => row.warehouse_id).filter((id): id is string => Boolean(id)))
  )
  const creatorIds = Array.from(
    new Set(orderRows.map((row) => row.created_by).filter((id): id is string => Boolean(id)))
  )

  const [supplierNames, warehouseNames, profileNames] = await Promise.all([
    fetchNameMap(supabase, "suppliers", supplierIds),
    fetchNameMap(supabase, "warehouses", warehouseIds),
    fetchProfileNames(supabase, creatorIds),
  ])
  const itemsByOrder = new Map<
    string,
    Array<{ quantity_ordered: number | null; quantity_received: number | null }>
  >()

  if (orderIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabase
      .from(READ.purchaseOrderItems)
      .select("purchase_order_id, quantity_ordered, quantity_received")
      .in("purchase_order_id", orderIds)

    if (itemsError) {
      throw itemsError
    }

    for (const item of itemRows ?? []) {
      if (!item.purchase_order_id) {
        continue
      }

      const bucket = itemsByOrder.get(item.purchase_order_id) ?? []
      bucket.push(item)
      itemsByOrder.set(item.purchase_order_id, bucket)
    }
  }

  return orderRows.map((row) => {
    const items = itemsByOrder.get(row.id) ?? []
    const quantityOrdered = items.reduce(
      (sum, item) => sum + (item.quantity_ordered ?? 0),
      0
    )
    const quantityReceived = items.reduce(
      (sum, item) => sum + (item.quantity_received ?? 0),
      0
    )
    const includeFinancials = canViewPurchaseFinancials(user)

    return {
      id: row.id,
      documentNumber: row.document_number ?? "—",
      status: mapPurchaseOrderStatus(row.status ?? "draft"),
      supplierId: row.supplier_id ?? "",
      supplierName: row.supplier_id
        ? supplierNames.get(row.supplier_id) ?? "Proveedor desconocido"
        : "Proveedor desconocido",
      warehouseId: row.warehouse_id ?? "",
      warehouseName: row.warehouse_id
        ? warehouseNames.get(row.warehouse_id) ?? "Almacén desconocido"
        : "Almacén desconocido",
      orderedAt: row.ordered_at,
      createdAt: row.created_at ?? new Date(0).toISOString(),
      total: includeFinancials ? Number(row.total ?? 0) : 0,
      currencyCode: user.organizationBaseCurrency,
      quantityOrdered,
      quantityReceived,
      createdByName: row.created_by
        ? profileNames.get(row.created_by) ?? "Usuario desconocido"
        : "Usuario desconocido",
    }
  })
}

async function fetchNameMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "suppliers" | "warehouses",
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (ids.length === 0) {
    return map
  }

  const { data, error } = await supabase.from(table).select("id, name").in("id", ids)
  if (error) {
    throw error
  }

  for (const row of data ?? []) {
    map.set(row.id, row.name)
  }

  return map
}

async function fetchProfileNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (ids.length === 0) {
    return map
  }

  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", ids)
  if (error) {
    throw error
  }

  for (const row of data ?? []) {
    map.set(row.id, row.full_name)
  }

  return map
}

export async function getPurchaseOrderById(
  user: AuthenticatedUser,
  purchaseOrderId: string
): Promise<PurchaseOrderDetail> {
  const supabase = await createClient()
  const organizationId = user.organizationId

  const { data: header, error: headerError } = await supabase
    .from(READ.purchaseOrders)
    .select(
      "id, document_number, status, supplier_id, warehouse_id, ordered_at, created_at, updated_at, subtotal, total, notes, created_by"
    )
    .eq("id", purchaseOrderId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (headerError) {
    throw headerError
  }

  if (!header?.id) {
    throw new NotFoundError("Orden de compra no encontrada.")
  }

  const [supplierNames, warehouseNames, profileNames] = await Promise.all([
    header.supplier_id
      ? fetchNameMap(supabase, "suppliers", [header.supplier_id])
      : Promise.resolve(new Map<string, string>()),
    header.warehouse_id
      ? fetchNameMap(supabase, "warehouses", [header.warehouse_id])
      : Promise.resolve(new Map<string, string>()),
    header.created_by
      ? fetchProfileNames(supabase, [header.created_by])
      : Promise.resolve(new Map<string, string>()),
  ])

  const [
    { data: lineRows, error: lineError },
    { data: receiptRows, error: receiptError },
  ] = await Promise.all([
    supabase
      .from(READ.purchaseOrderItems)
      .select(
        "id, product_variant_id, quantity_ordered, quantity_received, unit_cost, line_total"
      )
      .eq("purchase_order_id", purchaseOrderId),
    supabase
      .from("purchase_receipts")
      .select(
        `
          id,
          document_number,
          received_at,
          notes,
          profiles!purchase_receipts_created_by_fkey ( full_name )
        `
      )
      .eq("purchase_order_id", purchaseOrderId)
      .eq("organization_id", organizationId),
  ])

  if (lineError) {
    throw lineError
  }

  if (receiptError) {
    throw receiptError
  }

  const variantIds = Array.from(
    new Set((lineRows ?? []).map((line) => line.product_variant_id))
  )

  const variantMeta = new Map<
    string,
    { name: string; sku: string; productName: string }
  >()

  if (variantIds.length > 0) {
    const { data: variants, error: variantError } = await supabase
      .from(READ.productVariants)
      .select("id, name, sku, product_id")
      .in("id", variantIds)

    if (variantError) {
      throw variantError
    }

    const productIds = Array.from(
      new Set((variants ?? []).map((variant) => variant.product_id))
    )
    const productNames = new Map<string, string>()

    if (productIds.length > 0) {
      const { data: products, error: productError } = await supabase
        .from(READ.products)
        .select("id, name")
        .in("id", productIds)

      if (productError) {
        throw productError
      }

      for (const product of products ?? []) {
        if (product.id && product.name) {
          productNames.set(product.id, product.name)
        }
      }
    }

    for (const variant of variants ?? []) {
      if (!variant.id || !variant.product_id) {
        continue
      }

      variantMeta.set(variant.id, {
        name: variant.name ?? "Default",
        sku: variant.sku ?? "—",
        productName: productNames.get(variant.product_id) ?? "Producto desconocido",
      })
    }
  }

  const receiptIds = (receiptRows ?? [])
    .map((receipt) => receipt.id)
    .filter((id): id is string => Boolean(id))
  const receiptItemsByReceipt = new Map<
    string,
    Array<{
      id: string
      product_variant_id: string
      quantity_received: number
      unit_cost: number | null
      movement_id: string | null
    }>
  >()
  const movementMeta = new Map<
    string,
    { quantity_before: number | null; quantity_after: number | null }
  >()

  if (receiptIds.length > 0) {
    const { data: receiptItems, error: receiptItemsError } = await supabase
      .from(READ.purchaseReceiptItems)
      .select(
        "id, purchase_receipt_id, product_variant_id, quantity_received, unit_cost, movement_id"
      )
      .in("purchase_receipt_id", receiptIds)

    if (receiptItemsError) {
      throw receiptItemsError
    }

    const movementIds = Array.from(
      new Set(
        (receiptItems ?? [])
          .map((item) => item.movement_id)
          .filter((id): id is string => Boolean(id))
      )
    )

    if (movementIds.length > 0) {
      const { data: movements, error: movementError } = await supabase
        .from("inventory_movements")
        .select("id, quantity_before, quantity_after")
        .in("id", movementIds)

      if (movementError) {
        throw movementError
      }

      for (const movement of movements ?? []) {
        movementMeta.set(movement.id, {
          quantity_before: movement.quantity_before,
          quantity_after: movement.quantity_after,
        })
      }
    }

    for (const item of receiptItems ?? []) {
      if (
        !item.purchase_receipt_id ||
        !item.id ||
        !item.product_variant_id ||
        item.quantity_received === null
      ) {
        continue
      }

      if (!variantMeta.has(item.product_variant_id)) {
        const { data: variant, error: variantError } = await supabase
          .from(READ.productVariants)
          .select("id, name, sku, product_id")
          .eq("id", item.product_variant_id)
          .maybeSingle()

        if (variantError) {
          throw variantError
        }

        if (variant?.id && variant.product_id) {
          const { data: product, error: productError } = await supabase
            .from(READ.products)
            .select("name")
            .eq("id", variant.product_id)
            .maybeSingle()

          if (productError) {
            throw productError
          }

          variantMeta.set(variant.id, {
            name: variant.name ?? "Default",
            sku: variant.sku ?? "—",
            productName: product?.name ?? "Producto desconocido",
          })
        }
      }

      const bucket = receiptItemsByReceipt.get(item.purchase_receipt_id) ?? []
      bucket.push({
        id: item.id,
        product_variant_id: item.product_variant_id,
        quantity_received: item.quantity_received,
        unit_cost: item.unit_cost,
        movement_id: item.movement_id,
      })
      receiptItemsByReceipt.set(item.purchase_receipt_id, bucket)
    }
  }

  const includeFinancials = canViewPurchaseFinancials(user)

  return {
    id: header.id,
    documentNumber: header.document_number ?? "—",
    status: mapPurchaseOrderStatus(header.status ?? "draft"),
    supplierId: header.supplier_id ?? "",
    supplierName: header.supplier_id
      ? supplierNames.get(header.supplier_id) ?? "Proveedor desconocido"
      : "Proveedor desconocido",
    warehouseId: header.warehouse_id ?? "",
    warehouseName: header.warehouse_id
      ? warehouseNames.get(header.warehouse_id) ?? "Almacén desconocido"
      : "Almacén desconocido",
    orderedAt: header.ordered_at,
    createdAt: header.created_at ?? new Date(0).toISOString(),
    updatedAt: header.updated_at ?? new Date(0).toISOString(),
    subtotal: includeFinancials ? Number(header.subtotal ?? 0) : 0,
    total: includeFinancials ? Number(header.total ?? 0) : 0,
    currencyCode: user.organizationBaseCurrency,
    notes: header.notes,
    createdByName: header.created_by
      ? profileNames.get(header.created_by) ?? "Usuario desconocido"
      : "Usuario desconocido",
    lines: (lineRows ?? [])
      .filter((line) => line.id && line.product_variant_id)
      .map((line) => {
      const meta = variantMeta.get(line.product_variant_id!)
      const quantityOrdered = line.quantity_ordered ?? 0
      const quantityReceived = line.quantity_received ?? 0

      return {
        id: line.id!,
        productVariantId: line.product_variant_id!,
        productName: meta?.productName ?? "Producto desconocido",
        variantName: meta?.name ?? "Default",
        sku: meta?.sku ?? "—",
        quantityOrdered,
        quantityReceived,
        quantityRemaining: quantityOrdered - quantityReceived,
        unitCost: includeFinancials ? Number(line.unit_cost ?? 0) : 0,
        lineTotal: includeFinancials ? Number(line.line_total ?? 0) : 0,
      }
    }),
    receipts: (receiptRows ?? [])
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
        lines: (receiptItemsByReceipt.get(receipt.id) ?? []).map((item) => {
          const meta = variantMeta.get(item.product_variant_id)
          const movement = item.movement_id
            ? movementMeta.get(item.movement_id)
            : null

          return {
            id: item.id,
            productName: meta?.productName ?? "Producto desconocido",
            variantName: meta?.name ?? "Default",
            sku: meta?.sku ?? "—",
            quantityReceived: item.quantity_received,
            unitCost: includeFinancials ? Number(item.unit_cost ?? 0) : 0,
            movementId: item.movement_id ?? "",
            quantityBefore: movement?.quantity_before ?? null,
            quantityAfter: movement?.quantity_after ?? null,
          }
        }),
      })),
  }
}

export async function createPurchaseOrder(
  user: AuthenticatedUser,
  input: CreatePurchaseInput
): Promise<{ id: string }> {
  const supabase = await createClient()
  const organizationId = user.organizationId

  const currencyCode = resolveTransactionCurrency(
    user.organizationAllowedCurrencies,
    input.currencyCode
  )

  const rpcArgs: CreatePurchaseOrderRpcArgs = {
    p_organization_id: organizationId,
    p_supplier_id: input.supplierId,
    p_warehouse_id: input.warehouseId,
    p_lines: input.lines.map((line) => ({
      product_variant_id: line.productVariantId,
      quantity_ordered: line.quantityOrdered,
      unit_cost: line.unitCost,
    })),
    p_notes: input.notes ?? null,
    p_currency_code: currencyCode,
    p_idempotency_key: input.idempotencyKey,
  }

  const { data: purchaseOrderId, error } = await supabase.rpc(
    "create_purchase_order",
    rpcArgs
  )

  if (error) {
    mapRpcError(error)
  }

  if (!purchaseOrderId) {
    throw new ConflictError("No se pudo crear la orden de compra.")
  }

  return { id: purchaseOrderId }
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
