import { z } from "zod"

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
  productVariantId: z.string().uuid("Select a valid product variant."),
  quantityOrdered: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .positive("Quantity must be greater than zero."),
  unitCost: z.coerce
    .number()
    .min(0, "Unit cost cannot be negative.")
    .multipleOf(0.01, "Unit cost must have at most two decimal places."),
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
  supplierId: z.string().uuid("Select a supplier."),
  warehouseId: z.string().uuid("Select a warehouse."),
  notes: optionalNotesSchema,
  lines: z
    .array(createPurchaseLineSchema)
    .min(1, "Add at least one product line."),
})

export const receivePurchaseLineSchema = z.object({
  purchaseOrderItemId: z.string().uuid("Invalid purchase line."),
  quantityReceived: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .positive("Quantity must be greater than zero."),
  unitCost: z.coerce
    .number()
    .min(0, "Unit cost cannot be negative.")
    .optional(),
})

export const receivePurchaseSchema = z.object({
  purchaseOrderId: z.string().uuid("Invalid purchase order."),
  notes: optionalNotesSchema,
  lines: z
    .array(receivePurchaseLineSchema)
    .min(1, "Add at least one line to receive."),
  idempotencyKey: z.string().uuid().optional(),
})
