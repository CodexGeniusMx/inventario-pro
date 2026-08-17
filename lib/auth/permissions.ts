import type { AuthenticatedUser, Permission } from "@/lib/auth/types"

export function hasPermission(
  user: AuthenticatedUser,
  resource: string,
  action: string
): boolean {
  return user.permissions.some(
    (permission) =>
      permission.resource === resource && permission.action === action
  )
}

export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === "admin"
}

export function permissionsFromRows(
  rows: { permissions: { resource: string; action: string } | null }[]
): Permission[] {
  return rows
    .map((row) => row.permissions)
    .filter((permission): permission is Permission => permission !== null)
}
