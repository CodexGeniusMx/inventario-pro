import { z } from "zod"

import { SUPPORTED_CURRENCIES } from "@/lib/currency/types"

export const companySettingsSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la empresa es obligatorio."),
  timezone: z.string().trim().min(1, "La zona horaria es obligatoria."),
})

export const currencySettingsSchema = z
  .object({
    baseCurrency: z.enum(SUPPORTED_CURRENCIES),
    allowedCurrencies: z
      .array(z.enum(SUPPORTED_CURRENCIES))
      .min(1, "Selecciona al menos una moneda."),
    confirmNoConversion: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.allowedCurrencies.includes(value.baseCurrency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La moneda base debe estar incluida en las monedas permitidas.",
        path: ["baseCurrency"],
      })
    }
  })

export const inventorySettingsSchema = z.object({
  defaultWarehouseId: z.string().uuid().nullable(),
})

export const aiSettingsSchema = z.object({
  enabled: z.boolean(),
  allowQueries: z.boolean(),
  allowPrepare: z.boolean(),
  requireConfirmation: z.boolean(),
})

export const whatsappSettingsSchema = z.object({
  enabled: z.boolean(),
  businessNumber: z.string().trim().nullable(),
  connected: z.boolean(),
  lowStockAlerts: z.boolean(),
  outOfStockAlerts: z.boolean(),
  dailySalesSummary: z.boolean(),
  purchaseReceivedAlerts: z.boolean(),
  pendingPurchaseReminders: z.boolean(),
  keepAiQueries: z.boolean(),
})
