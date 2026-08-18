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
  productVariantId: z.string().uuid("Selecciona una variante de producto válida."),
  quantity: z.coerce
    .number()
    .int("La cantidad debe ser un número entero.")
    .positive("La cantidad debe ser mayor que cero."),
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
  warehouseId: z.string().uuid("Selecciona un almacén."),
  customerId: z
    .union([z.string().uuid(), z.null()])
    .optional()
    .transform((value) => value ?? null),
  notes: optionalNotesSchema,
  discountAmount: z.coerce
    .number()
    .min(0, "El descuento no puede ser negativo.")
    .optional()
    .default(0),
  lines: z.array(createSaleLineSchema).min(1, "Agrega al menos una línea de producto."),
  idempotencyKey: z.string().uuid().optional(),
})
