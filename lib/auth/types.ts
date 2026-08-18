import type { Database } from "@/lib/database.types"
import type { SupportedCurrency } from "@/lib/currency/types"

export type AppRole = Database["public"]["Enums"]["app_role"]

export type Permission = {
  resource: string
  action: string
}

export type AuthenticatedUser = {
  id: string
  email: string
  fullName: string
  organizationId: string
  organizationName: string
  organizationSlug: string
  organizationTimezone: string
  organizationBaseCurrency: SupportedCurrency
  organizationAllowedCurrencies: SupportedCurrency[]
  defaultWarehouseId: string | null
  role: AppRole
  branchId: string | null
  isActive: boolean
  permissions: Permission[]
  aiEnabled: boolean
  aiAllowQueries: boolean
  aiAllowPrepare: boolean
  aiRequireConfirmation: boolean
}
