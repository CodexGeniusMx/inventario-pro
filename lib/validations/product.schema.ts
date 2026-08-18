import { z } from "zod"

const moneySchema = z.coerce
  .number()
  .min(0, "El precio debe ser cero o mayor.")
  .multipleOf(0.01, "Usa como máximo dos decimales.")

const optionalMoneySchema = z
  .union([moneySchema, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value))

const reorderPointSchema = z.coerce
  .number()
  .int("El punto de reorden debe ser un número entero.")
  .min(0, "El punto de reorden debe ser cero o mayor.")

export const productVariantInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la variante es obligatorio."),
  sku: z.string().trim().min(1, "El SKU es obligatorio."),
  barcode: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? null : value ?? null))
    .refine(
      (value) =>
        value === null ||
        (/^[A-Za-z0-9-]+$/.test(value) && value.length >= 4 && value.length <= 32),
      "El código de barras debe tener entre 4 y 32 caracteres y usar letras, números o guiones."
    ),
  costPrice: optionalMoneySchema,
  salePrice: optionalMoneySchema,
  reorderPoint: reorderPointSchema.default(0),
})

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "El nombre del producto es obligatorio."),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? null : value ?? null)),
  categoryId: z
    .string()
    .uuid("Selecciona una categoría válida.")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((value) => (value === "" || value === undefined ? null : value)),
  unitOfMeasure: z.string().trim().min(1, "La unidad de medida es obligatoria."),
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
