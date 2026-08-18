"use server"

import { redirect } from "next/navigation"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { requireUser } from "@/lib/auth/session"
import { completeInvitation } from "@/services/users/user.service"

export async function acceptInviteAction(
  invitationId: string
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireUser()
    await completeInvitation(invitationId)
    return actionSuccess({ message: "Invitación completada." })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function acceptInviteAndRedirectAction(
  invitationId: string
): Promise<void> {
  const result = await acceptInviteAction(invitationId)
  if (!result.success) {
    redirect(`/accept-invite?invitation=${invitationId}&error=1`)
  }
  redirect("/dashboard")
}
