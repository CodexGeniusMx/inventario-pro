"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireRolePermissionsAccess } from "@/lib/auth/session"
import { actionSuccess, toActionResult, type ActionResult } from "@/lib/errors/action-result"
import type { AppRole } from "@/lib/auth/types"
import {
  restoreRolePermissionsToDefault,
  updateRolePermissions,
  type PermissionChangeInput,
} from "@/services/permissions/role-permissions.service"

const roleSchema = z.enum([
  "admin",
  "manager",
  "seller",
  "warehouse",
  "read_only",
])

const changesSchema = z.array(
  z.object({
    permissionId: z.string().uuid(),
    granted: z.boolean(),
  })
)

export async function saveRolePermissionsAction(input: {
  role: AppRole
  changes: PermissionChangeInput[]
}): Promise<ActionResult<{ applied: number; message: string }>> {
  try {
    const user = await requireRolePermissionsAccess()
    const parsedRole = roleSchema.safeParse(input.role)

    if (!parsedRole.success) {
      return toActionResult(parsedRole.error)
    }

    const parsedChanges = changesSchema.safeParse(input.changes)

    if (!parsedChanges.success) {
      return toActionResult(parsedChanges.error)
    }

    const result = await updateRolePermissions(
      user,
      parsedRole.data,
      parsedChanges.data
    )

    revalidatePath("/settings/permissions")
    revalidatePath(`/settings/permissions/${parsedRole.data}`)

    return actionSuccess({
      applied: result.applied,
      message:
        result.applied > 0
          ? "Permisos actualizados."
          : "No hubo cambios que guardar.",
    })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function restoreRolePermissionsAction(input: {
  role: AppRole
}): Promise<ActionResult<{ removedOverrides: number; message: string }>> {
  try {
    const user = await requireRolePermissionsAccess()
    const parsedRole = roleSchema.safeParse(input.role)

    if (!parsedRole.success) {
      return toActionResult(parsedRole.error)
    }

    const result = await restoreRolePermissionsToDefault(user, parsedRole.data)

    revalidatePath("/settings/permissions")
    revalidatePath(`/settings/permissions/${parsedRole.data}`)

    return actionSuccess({
      removedOverrides: result.removedOverrides,
      message:
        result.removedOverrides > 0
          ? "Permisos restaurados a los valores predeterminados."
          : "Este rol ya usaba los permisos predeterminados.",
    })
  } catch (error) {
    return toActionResult(error)
  }
}
