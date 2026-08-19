"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import {
  getInviteActivationPageState,
  type InviteActivationPageState,
} from "@/lib/auth/invite-activation"
import {
  establishInviteAuthSession,
  logInviteCallback,
} from "@/lib/auth/invite-session"
import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { UnauthorizedError, ValidationError } from "@/lib/errors/app-error"
import {
  invitationIdSchema,
  invitePageQuerySchema,
} from "@/lib/validations/invitation.schema"
import { createClient } from "@/lib/supabase/server"
import { completeInvitation } from "@/services/users/user.service"

const establishInviteSessionSchema = z.object({
  code: z.string().min(1).optional(),
  tokenHash: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  invitationId: z.string().uuid().nullable().optional(),
})

function mapEstablishSessionError(
  reason: string,
  authCode?: string
): string {
  if (authCode === "otp_expired" || authCode === "invite_not_found") {
    return "El enlace de invitación expiró o ya no es válido. Solicita una nueva invitación."
  }

  if (reason === "missing_credentials") {
    return "El enlace de invitación no incluyó credenciales válidas."
  }

  return "No se pudo validar el enlace de invitación. Solicita una nueva invitación."
}

export async function establishInviteSessionAction(
  input: unknown
): Promise<ActionResult<{ email: string }>> {
  try {
    const parsed = establishInviteSessionSchema.parse(input)

    logInviteCallback({
      callbackReached: true,
      codePresent: Boolean(parsed.code),
      tokenHashPresent: Boolean(parsed.tokenHash),
      type: parsed.type ?? null,
      invitationIdPresent: Boolean(parsed.invitationId),
    })

    const sessionResult = await establishInviteAuthSession({
      code: parsed.code ?? null,
      tokenHash: parsed.tokenHash ?? null,
      type: parsed.type ?? null,
    })

    if (!sessionResult.success) {
      logInviteCallback({
        authExchangeSuccess: false,
        failureReason: sessionResult.reason,
        authCode: sessionResult.authCode,
        authStatus: sessionResult.authStatus,
      })

      return {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: mapEstablishSessionError(
            sessionResult.reason,
            sessionResult.authCode
          ),
        },
      }
    }

    logInviteCallback({
      authExchangeSuccess: true,
      authExchangeMethod: sessionResult.method,
      authenticatedUserId: sessionResult.userId,
      authenticatedEmail: sessionResult.email,
    })

    return actionSuccess({ email: sessionResult.email })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function getInviteActivationPageAction(
  input: unknown
): Promise<ActionResult<InviteActivationPageState>> {
  try {
    const parsed = invitePageQuerySchema.parse(input)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const state = await getInviteActivationPageState({
      invitationId: parsed.invitationId,
      authUserId: user?.id ?? null,
      authUserEmail: user?.email ?? null,
      callbackError: parsed.callbackError ?? null,
    })

    return actionSuccess(state)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function activateInvitedAccountAction(
  input: unknown
): Promise<ActionResult<{ message: string }>> {
  try {
    const parsed = invitationIdSchema.parse(input)
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      throw new UnauthorizedError(
        "Abre el enlace desde el correo de invitación para continuar."
      )
    }

    const activationState = await getInviteActivationPageState({
      invitationId: parsed.invitationId,
      authUserId: user.id,
      authUserEmail: user.email,
    })

    if (activationState.status !== "needs_password") {
      throw new ValidationError(activationState.message)
    }

    await completeInvitation(activationState.invitationId)
    revalidatePath("/", "layout")
    return actionSuccess({ message: "Cuenta activada correctamente." })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function acceptInviteAction(
  invitationId: string
): Promise<ActionResult<{ message: string }>> {
  return activateInvitedAccountAction({ invitationId })
}

export async function acceptInviteAndRedirectAction(
  invitationId: string
): Promise<void> {
  const result = await activateInvitedAccountAction({ invitationId })

  if (!result.success) {
    redirect(`/accept-invite?invitation=${invitationId}&error=1`)
  }

  redirect("/dashboard")
}
