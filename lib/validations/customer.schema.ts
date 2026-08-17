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
    "Enter a valid email address."
  )

export const customerListFiltersSchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(["all", "active", "inactive"]).optional(),
})

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required."),
  email: optionalEmail,
  phone: optionalText,
  taxId: optionalText,
  notes: optionalText,
  isActive: z.boolean().optional().default(true),
})

export const updateCustomerSchema = createCustomerSchema
