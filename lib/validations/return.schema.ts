import { z } from "zod"

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

export const returnListFiltersSchema = z.object({
  q: z.string().trim().optional(),
})

export const processReturnLineSchema = z.object({
  saleItemId: z.string().uuid("Selecciona una línea de venta válida."),
  quantity: z.coerce
    .number()
    .int("La cantidad debe ser un número entero.")
    .positive("La cantidad debe ser mayor que cero."),
  isRestockable: z.boolean().optional().default(true),
})

export const processReturnSchema = z.object({
  saleId: z.string().uuid("Selecciona una venta válida."),
  reason: z.string().trim().min(1, "Ingresa un motivo de devolución."),
  notes: optionalNotesSchema,
  lines: z
    .array(processReturnLineSchema)
    .min(1, "Agrega al menos una línea para devolver."),
  idempotencyKey: z.string().uuid().optional(),
})
