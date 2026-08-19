"use server"

import { revalidatePath } from "next/cache"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { requireUsersAccessOrRedirect } from "@/lib/auth/session"
import {
  cancelOrganizationInvitation,
  inviteOrganizationUser,
  resendOrganizationInvitation,
  setUserActiveState,
  updateUserRole,
} from "@/services/users/user.service"
import {
  invitationActionSchema,
  inviteUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "@/lib/validations/user.schema"

export async function inviteUserAction(
  input: unknown
): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireUsersAccessOrRedirect()
    const parsed = inviteUserSchema.parse(input)
    await inviteOrganizationUser(user, parsed)
    revalidatePath("/users")
    return actionSuccess({ message: "Invitación enviada correctamente." })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateUserRoleAction(
  input: unknown
): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireUsersAccessOrRedirect()
    const parsed = updateUserRoleSchema.parse(input)
    await updateUserRole(user, parsed.userId, parsed.role)
    revalidatePath("/users")
    return actionSuccess({ message: "Rol actualizado." })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateUserStatusAction(
  input: unknown
): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireUsersAccessOrRedirect()
    const parsed = updateUserStatusSchema.parse(input)
    await setUserActiveState(user, parsed.userId, parsed.isActive)
    revalidatePath("/users")
    return actionSuccess({
      message: parsed.isActive ? "Usuario activado." : "Usuario desactivado.",
    })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function cancelInvitationAction(
  input: unknown
): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireUsersAccessOrRedirect()
    const parsed = invitationActionSchema.parse(input)
    await cancelOrganizationInvitation(user, parsed.invitationId)
    revalidatePath("/users")
    return actionSuccess({ message: "Invitación cancelada." })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function resendInvitationAction(
  input: unknown
): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireUsersAccessOrRedirect()
    const parsed = invitationActionSchema.parse(input)
    await resendOrganizationInvitation(user, parsed.invitationId)
    revalidatePath("/users")
    return actionSuccess({ message: "Invitación reenviada." })
  } catch (error) {
    return toActionResult(error)
  }
}
