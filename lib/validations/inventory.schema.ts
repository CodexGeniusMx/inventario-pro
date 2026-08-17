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
  productVariantId: z.string().uuid("Select a valid variant."),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .positive("Quantity must be greater than zero."),
})

export const createStockAdjustmentSchema = z.object({
  warehouseId: z.string().uuid("Select a warehouse."),
  adjustmentType: adjustmentTypeSchema,
  reason: z.string().trim().min(1, "Reason is required."),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? null : value ?? null)),
  lines: z
    .array(adjustmentLineSchema)
    .min(1, "Add at least one product line."),
  idempotencyKey: z.string().uuid().optional(),
})

export const createWarehouseSchema = z.object({
  name: z.string().trim().min(1, "Warehouse name is required."),
  code: z
    .string()
    .trim()
    .min(1, "Warehouse code is required.")
    .max(20, "Code must be 20 characters or fewer.")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Code may only contain letters, numbers, hyphens, and underscores."
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
