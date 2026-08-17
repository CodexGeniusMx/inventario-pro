import { z } from "zod"

const moneySchema = z.coerce
  .number()
  .min(0, "Price must be zero or greater.")
  .multipleOf(0.01, "Use at most two decimal places.")

const optionalMoneySchema = z
  .union([moneySchema, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value))

const reorderPointSchema = z.coerce
  .number()
  .int("Reorder point must be a whole number.")
  .min(0, "Reorder point must be zero or greater.")

export const productVariantInputSchema = z.object({
  name: z.string().trim().min(1, "Variant name is required."),
  sku: z.string().trim().min(1, "SKU is required."),
  barcode: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? null : value ?? null))
    .refine(
      (value) =>
        value === null ||
        (/^[A-Za-z0-9-]+$/.test(value) && value.length >= 4 && value.length <= 32),
      "Barcode must be 4–32 characters and use letters, numbers, or hyphens."
    ),
  costPrice: optionalMoneySchema,
  salePrice: optionalMoneySchema,
  reorderPoint: reorderPointSchema.default(0),
})

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required."),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? null : value ?? null)),
  categoryId: z
    .string()
    .uuid("Select a valid category.")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((value) => (value === "" || value === undefined ? null : value)),
  unitOfMeasure: z.string().trim().min(1, "Unit of measure is required."),
  baseCostPrice: moneySchema,
  baseSalePrice: moneySchema,
  variant: productVariantInputSchema,
})

export const updateProductSchema = createProductSchema.extend({
  variant: productVariantInputSchema.extend({
    id: z.string().uuid().optional(),
  }),
})

export const productListFiltersSchema = z.object({
  q: z.string().trim().optional(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["all", "active", "archived"]).optional(),
})

export type CreateProductFormInput = z.infer<typeof createProductSchema>
export type UpdateProductFormInput = z.infer<typeof updateProductSchema>
