import type { AppRole } from "@/lib/auth/types"

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  manager: "Gerente",
  seller: "Vendedor",
  warehouse: "Almacén",
  read_only: "Solo lectura",
  employee: "Empleado",
}

export const INVITABLE_ROLES: AppRole[] = [
  "admin",
  "manager",
  "seller",
  "warehouse",
  "read_only",
]

export function getRoleLabel(role: AppRole): string {
  return ROLE_LABELS[role] ?? role
}

export function isOrgAdminRole(role: AppRole): boolean {
  return role === "owner" || role === "admin"
}

export function canManageUsers(role: AppRole): boolean {
  return isOrgAdminRole(role)
}
