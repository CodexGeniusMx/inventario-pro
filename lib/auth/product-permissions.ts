import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  canViewProductCosts,
  hasAnyPermission,
  hasPermission,
} from "@/lib/auth/permissions"
import { ForbiddenError } from "@/lib/errors/app-error"

export function canViewProducts(user: AuthenticatedUser): boolean {
  return hasAnyPermission(user, [
    { resource: "products", action: "view" },
    { resource: "products", action: "read" },
  ])
}

export function canCreateProducts(user: AuthenticatedUser): boolean {
  return hasAnyPermission(user, [
    { resource: "products", action: "create" },
    { resource: "products", action: "write" },
  ])
}

export function canEditProducts(user: AuthenticatedUser): boolean {
  return hasAnyPermission(user, [
    { resource: "products", action: "edit" },
    { resource: "products", action: "write" },
  ])
}

export function canArchiveProducts(user: AuthenticatedUser): boolean {
  return hasAnyPermission(user, [
    { resource: "products", action: "archive" },
    { resource: "products", action: "write" },
  ])
}

export function canManageCategories(user: AuthenticatedUser): boolean {
  return hasAnyPermission(user, [
    { resource: "categories", action: "write" },
    { resource: "products", action: "create" },
    { resource: "products", action: "edit" },
    { resource: "products", action: "write" },
  ])
}

export function canManageUnits(user: AuthenticatedUser): boolean {
  return canManageCategories(user)
}

export { canViewProductCosts }

export function assertCanViewProducts(user: AuthenticatedUser): void {
  if (!canViewProducts(user)) {
    throw new ForbiddenError("No tienes permiso para consultar productos.")
  }
}

export function assertCanCreateProducts(user: AuthenticatedUser): void {
  if (!canCreateProducts(user)) {
    throw new ForbiddenError("No tienes permiso para crear productos.")
  }
}

export function assertCanEditProducts(user: AuthenticatedUser): void {
  if (!canEditProducts(user)) {
    throw new ForbiddenError("No tienes permiso para editar productos.")
  }
}

export function assertCanArchiveProducts(user: AuthenticatedUser): void {
  if (!canArchiveProducts(user)) {
    throw new ForbiddenError("No tienes permiso para archivar productos.")
  }
}

export function assertCanViewProductCosts(user: AuthenticatedUser): void {
  if (!canViewProductCosts(user)) {
    throw new ForbiddenError("No tienes permiso para consultar costos de compra.")
  }
}

export function assertCanManageCategories(user: AuthenticatedUser): void {
  if (!canManageCategories(user)) {
    throw new ForbiddenError("No tienes permiso para administrar categorías.")
  }
}

export function assertCanManageUnits(user: AuthenticatedUser): void {
  if (!canManageUnits(user)) {
    throw new ForbiddenError("No tienes permiso para administrar unidades de medida.")
  }
}

/**
 * Legacy write permission must not grant cost visibility alone.
 */
export function canMutateProductCatalog(user: AuthenticatedUser): boolean {
  return canEditProducts(user) || canCreateProducts(user) || canArchiveProducts(user)
}

export function userHasLegacyProductWrite(user: AuthenticatedUser): boolean {
  return hasPermission(user, "products", "write")
}
