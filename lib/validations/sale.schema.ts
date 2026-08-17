import { z } from "zod"

const saleStatusSchema = z.enum([
  "draft",
  "completed",
  "cancelled",
  "partially_returned",
  "fully_returned",
])

export const saleListFiltersSchema = z.object({
  q: z.string().trim().optional(),
  status: saleStatusSchema.or(z.literal("all")).optional(),
})

export const createSaleLineSchema = z.object({
  productVariantId: z.string().uuid("Select a valid product variant."),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .positive("Quantity must be greater than zero."),
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

export const createSaleSchema = z.object({
  warehouseId: z.string().uuid("Select a warehouse."),
  customerId: z
    .union([z.string().uuid(), z.null()])
    .optional()
    .transform((value) => value ?? null),
  notes: optionalNotesSchema,
  discountAmount: z.coerce
    .number()
    .min(0, "Discount cannot be negative.")
    .optional()
    .default(0),
  lines: z.array(createSaleLineSchema).min(1, "Add at least one product line."),
  idempotencyKey: z.string().uuid().optional(),
})
