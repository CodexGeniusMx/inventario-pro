import type { SupportedCurrency } from "@/lib/currency/types"
import type { AppRole } from "@/lib/auth/types"

export type OrganizationSettings = {
  id: string
  name: string
  slug: string
  timezone: string
  baseCurrency: SupportedCurrency
  allowedCurrencies: SupportedCurrency[]
  defaultWarehouseId: string | null
  documentPrefixes: {
    sale: string
    purchaseOrder: string
    purchaseReceipt: string
    return: string
    stockAdjustment: string
  }
  ai: {
    enabled: boolean
    allowQueries: boolean
    allowPrepare: boolean
    requireConfirmation: boolean
  }
  whatsapp: {
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
}

export type UserInvitation = {
  id: string
  email: string
  role: AppRole
  status: "pending" | "accepted" | "revoked" | "expired"
  expiresAt: string
  createdAt: string
  invitedByName: string | null
}

export type OrganizationUser = {
  id: string
  fullName: string
  email: string
  role: AppRole
  isActive: boolean
  createdAt: string
}
