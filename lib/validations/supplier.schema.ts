import { z } from "zod"

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? null : value ?? null))

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? null : value ?? null))
  .refine(
    (value) => value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Ingresa un correo electrónico válido."
  )

export const supplierListFiltersSchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(["all", "active", "inactive"]).optional(),
})

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "El nombre del proveedor es obligatorio."),
  contactName: optionalText,
  email: optionalEmail,
  phone: optionalText,
  taxId: optionalText,
  paymentTerms: optionalText,
  notes: optionalText,
  isActive: z.boolean().optional().default(true),
})

export const updateSupplierSchema = createSupplierSchema
