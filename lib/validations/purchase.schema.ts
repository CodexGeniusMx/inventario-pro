import { z } from "zod"

import { SUPPORTED_CURRENCIES } from "@/lib/currency/types"

const purchaseOrderStatusSchema = z.enum([
  "draft",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
])

export const purchaseListFiltersSchema = z.object({
  q: z.string().trim().optional(),
  status: purchaseOrderStatusSchema.or(z.literal("all")).optional(),
  supplierId: z.string().uuid().optional().or(z.literal("")),
})

export const createPurchaseLineSchema = z.object({
  productVariantId: z.string().uuid("Selecciona una variante de producto válida."),
  quantityOrdered: z.coerce
    .number()
    .int("La cantidad debe ser un número entero.")
    .positive("La cantidad debe ser mayor que cero."),
  unitCost: z.coerce
    .number()
    .min(0, "El costo unitario no puede ser negativo.")
    .multipleOf(0.01, "El costo unitario debe tener como máximo dos decimales."),
})

const optionalNotesSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (typeof value !== "string") {
      return null
    }

    const trimmed = value.trim()
    return trimmed === "" ? null : trimmed
  })

export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid("Selecciona un proveedor."),
  warehouseId: z.string().uuid("Selecciona un almacén."),
  currencyCode: z.enum(SUPPORTED_CURRENCIES).optional(),
  notes: optionalNotesSchema,
  lines: z
    .array(createPurchaseLineSchema)
    .min(1, "Agrega al menos una línea de producto."),
  idempotencyKey: z.string().uuid().optional(),
})

export const receivePurchaseLineSchema = z.object({
  purchaseOrderItemId: z.string().uuid("Línea de compra no válida."),
  quantityReceived: z.coerce
    .number()
    .int("La cantidad debe ser un número entero.")
    .positive("La cantidad debe ser mayor que cero."),
  unitCost: z.coerce
    .number()
    .min(0, "El costo unitario no puede ser negativo.")
    .optional(),
})

export const receivePurchaseSchema = z.object({
  purchaseOrderId: z.string().uuid("Orden de compra no válida."),
  notes: optionalNotesSchema,
  lines: z
    .array(receivePurchaseLineSchema)
    .min(1, "Agrega al menos una línea para recibir."),
  idempotencyKey: z.string().uuid().optional(),
})
