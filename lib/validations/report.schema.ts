import { z } from "zod"

export const reportDatePresetSchema = z.enum([
  "today",
  "last_7_days",
  "last_30_days",
  "this_month",
  "custom",
])

export const reportFiltersSchema = z.object({
  preset: reportDatePresetSchema.optional().default("last_30_days"),
  from: z.string().optional(),
  to: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
  productVariantId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  movementType: z.string().trim().optional(),
  q: z.string().trim().optional(),
})

export type ParsedReportFilters = z.infer<typeof reportFiltersSchema>

export const dashboardChartRangeSchema = z.enum(["7", "30"])
