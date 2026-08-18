import { z } from "zod"

const stockStatusSchema = z.enum(["all", "in_stock", "low_stock", "out_of_stock"])

const adjustmentTypeSchema = z.enum([
  "initial_stock",
  "increase",
  "decrease",
  "damage",
  "loss",
])

const movementTypeSchema = z.enum([
  "initial_stock",
  "purchase_receipt",
  "sale",
  "sale_return",
  "adjustment_increase",
  "adjustment_decrease",
  "damage",
  "loss",
  "transfer_in",
  "transfer_out",
])

export const inventoryListFiltersSchema = z.object({
  q: z.string().trim().optional(),
  warehouseId: z.string().uuid().optional().or(z.literal("")),
  stockStatus: stockStatusSchema.optional(),
})

export const movementListFiltersSchema = z.object({
  q: z.string().trim().optional(),
  warehouseId: z.string().uuid().optional().or(z.literal("")),
  movementType: movementTypeSchema.optional().or(z.literal("all")),
})

export const adjustmentLineSchema = z.object({
  productVariantId: z.string().uuid("Selecciona una variante válida."),
  quantity: z.coerce
    .number()
    .int("La cantidad debe ser un número entero.")
    .positive("La cantidad debe ser mayor que cero."),
})

export const createStockAdjustmentSchema = z.object({
  warehouseId: z.string().uuid("Selecciona un almacén."),
  adjustmentType: adjustmentTypeSchema,
  reason: z.string().trim().min(1, "El motivo es obligatorio."),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? null : value ?? null)),
  lines: z
    .array(adjustmentLineSchema)
    .min(1, "Agrega al menos una línea de producto."),
  idempotencyKey: z.string().uuid().optional(),
})

export const createWarehouseSchema = z.object({
  name: z.string().trim().min(1, "El nombre del almacén es obligatorio."),
  code: z
    .string()
    .trim()
    .min(1, "El código del almacén es obligatorio.")
    .max(20, "El código debe tener 20 caracteres o menos.")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "El código solo puede contener letras, números, guiones y guiones bajos."
    ),
  address: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? null : value ?? null)),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
})

export const updateWarehouseSchema = createWarehouseSchema

export type CreateStockAdjustmentFormInput = z.infer<
  typeof createStockAdjustmentSchema
>
export type CreateWarehouseFormInput = z.infer<typeof createWarehouseSchema>
