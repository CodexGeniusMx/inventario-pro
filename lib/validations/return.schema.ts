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
  saleItemId: z.string().uuid("Select a valid sale line."),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .positive("Quantity must be greater than zero."),
  isRestockable: z.boolean().optional().default(true),
})

export const processReturnSchema = z.object({
  saleId: z.string().uuid("Select a valid sale."),
  reason: z.string().trim().min(1, "Enter a return reason."),
  notes: optionalNotesSchema,
  lines: z
    .array(processReturnLineSchema)
    .min(1, "Add at least one line to return."),
  idempotencyKey: z.string().uuid().optional(),
})
