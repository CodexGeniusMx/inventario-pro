import type { AuthenticatedUser } from "@/lib/auth/types"
import { hasPermission, isAdmin } from "@/lib/auth/permissions"
import {
  normalizeAllowedCurrencies,
  validateCurrencyConfiguration,
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency/types"
import { ForbiddenError, ValidationError } from "@/lib/errors/app-error"
import { isMissingSchemaError } from "@/lib/auth/redirect-log"
import { createClient } from "@/lib/supabase/server"
import type { OrganizationSettings } from "@/types/settings"

function mapOrganizationRow(row: {
  id: string
  name: string
  slug: string
  timezone: string
  currency_code: string
  allowed_currencies: string[] | null
  default_warehouse_id: string | null
  document_prefix_sale?: string
  document_prefix_purchase_order?: string
  document_prefix_purchase_receipt?: string
  document_prefix_return?: string
  document_prefix_stock_adjustment?: string
  ai_enabled?: boolean
  ai_allow_queries?: boolean
  ai_allow_prepare?: boolean
  ai_require_confirmation?: boolean
  whatsapp_enabled?: boolean
  whatsapp_business_number?: string | null
  whatsapp_connected?: boolean
  whatsapp_low_stock_alerts?: boolean
  whatsapp_out_of_stock_alerts?: boolean
  whatsapp_daily_sales_summary?: boolean
  whatsapp_purchase_received_alerts?: boolean
  whatsapp_pending_purchase_reminders?: boolean
  whatsapp_keep_ai_queries?: boolean
}): OrganizationSettings {
  const baseCurrency = isSupportedCurrency(row.currency_code)
    ? row.currency_code
    : "MXN"

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    baseCurrency,
    allowedCurrencies: normalizeAllowedCurrencies(
      row.allowed_currencies ?? [baseCurrency]
    ),
    defaultWarehouseId: row.default_warehouse_id,
    documentPrefixes: {
      sale: row.document_prefix_sale ?? "S-",
      purchaseOrder: row.document_prefix_purchase_order ?? "PO-",
      purchaseReceipt: row.document_prefix_purchase_receipt ?? "PR-",
      return: row.document_prefix_return ?? "R-",
      stockAdjustment: row.document_prefix_stock_adjustment ?? "ADJ-",
    },
    ai: {
      enabled: row.ai_enabled ?? true,
      allowQueries: row.ai_allow_queries ?? true,
      allowPrepare: row.ai_allow_prepare ?? true,
      requireConfirmation: row.ai_require_confirmation ?? true,
    },
    whatsapp: {
      enabled: row.whatsapp_enabled ?? false,
      businessNumber: row.whatsapp_business_number ?? null,
      connected: row.whatsapp_connected ?? false,
      lowStockAlerts: row.whatsapp_low_stock_alerts ?? false,
      outOfStockAlerts: row.whatsapp_out_of_stock_alerts ?? false,
      dailySalesSummary: row.whatsapp_daily_sales_summary ?? false,
      purchaseReceivedAlerts: row.whatsapp_purchase_received_alerts ?? false,
      pendingPurchaseReminders:
        row.whatsapp_pending_purchase_reminders ?? false,
      keepAiQueries: row.whatsapp_keep_ai_queries ?? false,
    },
  }
}

function assertSettingsPermission(
  user: AuthenticatedUser,
  permission: string
): void {
  if (isAdmin(user) || hasPermission(user, "settings", permission)) {
    return
  }

  if (hasPermission(user, "settings", "write")) {
    return
  }

  throw new ForbiddenError()
}

export async function getOrganizationSettings(
  user: AuthenticatedUser
): Promise<OrganizationSettings> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", user.organizationId)
    .single()

  if (!error && data) {
    return mapOrganizationRow(data)
  }

  if (error && isMissingSchemaError(error)) {
    const { data: baseData, error: baseError } = await supabase
      .from("organizations")
      .select("id, name, slug, timezone, currency_code")
      .eq("id", user.organizationId)
      .single()

    if (baseError || !baseData) {
      throw baseError ?? new ValidationError("No se pudo cargar la configuración.")
    }

    return mapOrganizationRow({
      ...baseData,
      allowed_currencies: [baseData.currency_code],
      default_warehouse_id: null,
    })
  }

  throw error ?? new ValidationError("No se pudo cargar la configuración.")
}

export type UpdateCompanySettingsInput = {
  name: string
  timezone: string
}

export async function updateCompanySettings(
  user: AuthenticatedUser,
  input: UpdateCompanySettingsInput
): Promise<OrganizationSettings> {
  assertSettingsPermission(user, "company")

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("update_organization_settings", {
    p_name: input.name,
    p_timezone: input.timezone,
  })

  if (error) {
    throw error
  }

  return mapOrganizationRow(data)
}

export type UpdateCurrencySettingsInput = {
  baseCurrency: SupportedCurrency
  allowedCurrencies: SupportedCurrency[]
  confirmNoConversion?: boolean
}

export async function updateCurrencySettings(
  user: AuthenticatedUser,
  input: UpdateCurrencySettingsInput
): Promise<OrganizationSettings> {
  assertSettingsPermission(user, "currency")

  const allowed = normalizeAllowedCurrencies(input.allowedCurrencies)
  const validationError = validateCurrencyConfiguration(
    input.baseCurrency,
    allowed
  )

  if (validationError) {
    throw new ValidationError(validationError)
  }

  const current = await getOrganizationSettings(user)
  const baseChanged = current.baseCurrency !== input.baseCurrency

  if (baseChanged && !input.confirmNoConversion) {
    throw new ValidationError(
      "Debes confirmar que los precios del catálogo no se convertirán automáticamente."
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("update_organization_settings", {
    p_currency_code: input.baseCurrency,
    p_allowed_currencies: allowed,
  })

  if (error) {
    throw error
  }

  return mapOrganizationRow(data)
}

export type UpdateInventorySettingsInput = {
  defaultWarehouseId: string | null
}

export async function updateInventorySettings(
  user: AuthenticatedUser,
  input: UpdateInventorySettingsInput
): Promise<OrganizationSettings> {
  assertSettingsPermission(user, "inventory")

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("update_organization_settings", {
    p_default_warehouse_id: input.defaultWarehouseId ?? undefined,
  })

  if (error) {
    throw error
  }

  return mapOrganizationRow(data)
}

export type UpdateAiSettingsInput = {
  enabled: boolean
  allowQueries: boolean
  allowPrepare: boolean
  requireConfirmation: boolean
}

export async function updateAiSettings(
  user: AuthenticatedUser,
  input: UpdateAiSettingsInput
): Promise<OrganizationSettings> {
  assertSettingsPermission(user, "ai")

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("update_organization_settings", {
    p_ai_enabled: input.enabled,
    p_ai_allow_queries: input.allowQueries,
    p_ai_allow_prepare: input.allowPrepare,
    p_ai_require_confirmation: input.requireConfirmation,
  })

  if (error) {
    throw error
  }

  return mapOrganizationRow(data)
}

export type UpdateWhatsappSettingsInput = {
  enabled: boolean
  businessNumber: string | null
  connected: boolean
  lowStockAlerts: boolean
  outOfStockAlerts: boolean
  dailySalesSummary: boolean
  purchaseReceivedAlerts: boolean
  pendingPurchaseReminders: boolean
  keepAiQueries: boolean
}

export async function updateWhatsappSettings(
  user: AuthenticatedUser,
  input: UpdateWhatsappSettingsInput
): Promise<OrganizationSettings> {
  assertSettingsPermission(user, "whatsapp")

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("update_organization_settings", {
    p_whatsapp_enabled: input.enabled,
    p_whatsapp_business_number: input.businessNumber ?? undefined,
    p_whatsapp_connected: input.connected,
    p_whatsapp_low_stock_alerts: input.lowStockAlerts,
    p_whatsapp_out_of_stock_alerts: input.outOfStockAlerts,
    p_whatsapp_daily_sales_summary: input.dailySalesSummary,
    p_whatsapp_purchase_received_alerts: input.purchaseReceivedAlerts,
    p_whatsapp_pending_purchase_reminders: input.pendingPurchaseReminders,
    p_whatsapp_keep_ai_queries: input.keepAiQueries,
  })

  if (error) {
    throw error
  }

  return mapOrganizationRow(data)
}
