import type { SupportedCurrency } from "@/lib/currency/types"
import type { AuthenticatedUser, Permission } from "@/lib/auth/types"
import { isOrgAdminRole } from "@/lib/auth/roles"

export function hasPermission(
  user: AuthenticatedUser,
  resource: string,
  action: string
): boolean {
  if (isOrgAdminRole(user.role)) {
    return true
  }

  return user.permissions.some(
    (permission) =>
      permission.resource === resource && permission.action === action
  )
}

export function hasAnyPermission(
  user: AuthenticatedUser,
  checks: Array<{ resource: string; action: string }>
): boolean {
  return checks.some(({ resource, action }) =>
    hasPermission(user, resource, action)
  )
}

export function isAdmin(user: AuthenticatedUser): boolean {
  return isOrgAdminRole(user.role)
}

export function canViewProductCosts(user: AuthenticatedUser): boolean {
  return (
    hasPermission(user, "products", "view_cost") ||
    hasPermission(user, "purchases", "view_cost") ||
    hasPermission(user, "financial", "costs")
  )
}

export function canViewFinancialProfit(user: AuthenticatedUser): boolean {
  return hasPermission(user, "financial", "profit")
}

export function canViewFinancialRevenue(user: AuthenticatedUser): boolean {
  return hasPermission(user, "financial", "revenue")
}

export function canManageSettings(user: AuthenticatedUser): boolean {
  return hasAnyPermission(user, [
    { resource: "settings", action: "write" },
    { resource: "settings", action: "read" },
    { resource: "settings", action: "company" },
    { resource: "settings", action: "currency" },
    { resource: "settings", action: "inventory" },
    { resource: "settings", action: "ai" },
    { resource: "settings", action: "whatsapp" },
  ])
}

export function canManageRolePermissions(user: AuthenticatedUser): boolean {
  return (
    isOrgAdminRole(user.role) ||
    hasPermission(user, "roles", "manage_permissions")
  )
}

export function canManageUsers(user: AuthenticatedUser): boolean {
  return (
    isOrgAdminRole(user.role) ||
    hasAnyPermission(user, [
      { resource: "users", action: "write" },
      { resource: "users", action: "invite" },
      { resource: "users", action: "change_role" },
      { resource: "users", action: "deactivate" },
    ])
  )
}

export function canUseKeepAi(user: AuthenticatedUser): boolean {
  return user.aiEnabled !== false
}

export function permissionsFromRows(
  rows: { permissions: { resource: string; action: string } | null }[]
): Permission[] {
  return rows
    .map((row) => row.permissions)
    .filter((permission): permission is Permission => permission !== null)
}

export function getUserBaseCurrency(user: AuthenticatedUser): SupportedCurrency {
  return user.organizationBaseCurrency
}
