import type { AppRole } from "@/lib/auth/types"
import { canManageRolePermissions } from "@/lib/auth/permissions"
import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  getProtectedPermissionReason,
  isProtectedRolePermission,
  permissionKey,
} from "@/lib/permissions/catalog"
import { ForbiddenError } from "@/lib/errors/app-error"
import { createClient } from "@/lib/supabase/server"

export type EffectivePermissionRow = {
  permissionId: string
  resource: string
  action: string
  granted: boolean
  isOverride: boolean
  isDefault: boolean
  protected: boolean
  protectedReason: string | null
}

export type RolePermissionMatrix = {
  role: AppRole
  permissions: EffectivePermissionRow[]
  overrideCount: number
}

function assertCanManageRolePermissions(user: AuthenticatedUser): void {
  if (!canManageRolePermissions(user)) {
    throw new ForbiddenError()
  }
}

export async function getRolePermissionMatrix(
  user: AuthenticatedUser,
  role: AppRole
): Promise<RolePermissionMatrix> {
  assertCanManageRolePermissions(user)

  const supabase = await createClient()

  const { data, error } = await supabase.rpc("get_effective_permissions_for_role", {
    p_organization_id: user.organizationId,
    p_role: role,
  })

  if (error) {
    throw error
  }

  const rows = data ?? []

  const permissions: EffectivePermissionRow[] = rows.map((row) => ({
    permissionId: row.permission_id,
    resource: row.resource,
    action: row.action,
    granted: row.granted,
    isOverride: row.is_override,
    isDefault: row.is_default,
    protected: isProtectedRolePermission(role, row.resource, row.action, row.granted),
    protectedReason: getProtectedPermissionReason(role, row.resource, row.action),
  }))

  return {
    role,
    permissions,
    overrideCount: permissions.filter((permission) => permission.isOverride).length,
  }
}

export type PermissionChangeInput = {
  permissionId: string
  granted: boolean
}

export async function updateRolePermissions(
  user: AuthenticatedUser,
  role: AppRole,
  changes: PermissionChangeInput[]
): Promise<{ applied: number }> {
  assertCanManageRolePermissions(user)

  if (role === "owner") {
    throw new ForbiddenError("El rol Propietario no puede modificarse.")
  }

  const supabase = await createClient()

  const payload = changes.map((change) => ({
    permission_id: change.permissionId,
    granted: change.granted,
  }))

  const { data, error } = await supabase.rpc("update_organization_role_permissions", {
    p_role: role,
    p_changes: payload,
  })

  if (error) {
    if (error.message.includes("protected_permission")) {
      throw new ForbiddenError("No se puede modificar un permiso protegido.")
    }

    if (error.message.includes("owner_role_immutable")) {
      throw new ForbiddenError("El rol Propietario no puede modificarse.")
    }

    throw error
  }

  const result = (Array.isArray(data) ? data[0] : data) as
    | { applied?: number }
    | null

  return { applied: Number(result?.applied ?? 0) }
}

export async function restoreRolePermissionsToDefault(
  user: AuthenticatedUser,
  role: AppRole
): Promise<{ removedOverrides: number }> {
  assertCanManageRolePermissions(user)

  if (role === "owner") {
    throw new ForbiddenError("El rol Propietario no puede modificarse.")
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc("restore_organization_role_permissions", {
    p_role: role,
  })

  if (error) {
    throw error
  }

  const result = (Array.isArray(data) ? data[0] : data) as
    | { removed_overrides?: number }
    | null

  return { removedOverrides: Number(result?.removed_overrides ?? 0) }
}

export function buildPermissionMap(
  permissions: EffectivePermissionRow[]
): Map<string, EffectivePermissionRow> {
  return new Map(
    permissions.map((permission) => [
      permissionKey(permission.resource, permission.action),
      permission,
    ])
  )
}
