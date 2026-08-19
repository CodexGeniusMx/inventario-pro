import {
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors/app-error"
import { logInviteCallback } from "@/lib/auth/invite-session"
import { createAdminClient } from "@/lib/supabase/admin"

export type InviteActivationPageState =
  | {
      status: "needs_password"
      email: string
      invitationId: string
    }
  | {
      status:
        | "invalid"
        | "expired"
        | "cancelled"
        | "already_used"
        | "unauthenticated"
        | "auth_callback_failed"
        | "auth_callback_config"
        | "auth_callback_missing"
        | "organization_invitation_missing"
      message: string
    }

type PendingInvitationRow = {
  id: string
  email: string
  status: string
  expires_at: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function mapCallbackError(callbackError: string | null | undefined): InviteActivationPageState | null {
  switch (callbackError) {
    case "auth_callback_config":
      return {
        status: "auth_callback_config",
        message:
          "La configuración de autenticación no permite completar esta invitación. Verifica las Redirect URLs en Supabase.",
      }
    case "auth_callback_missing":
      return {
        status: "auth_callback_missing",
        message:
          "El enlace de invitación no incluyó credenciales válidas. Abre el enlace directamente desde el correo.",
      }
    case "auth_callback_exchange":
      return {
        status: "auth_callback_failed",
        message:
          "No se pudo validar el enlace de invitación. Solicita una nueva invitación.",
      }
    case "auth_callback":
      return {
        status: "auth_callback_failed",
        message:
          "No se pudo validar el enlace de invitación. Solicita una nueva invitación.",
      }
    default:
      return null
  }
}

async function findPendingOrganizationInvitation(input: {
  invitationId: string | null
  authUserEmail: string
}): Promise<PendingInvitationRow | null> {
  const admin = createAdminClient()
  const normalizedEmail = normalizeEmail(input.authUserEmail)

  if (input.invitationId) {
    const { data, error } = await admin
      .from("user_invitations")
      .select("id, email, status, expires_at")
      .eq("id", input.invitationId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data && normalizeEmail(data.email) === normalizedEmail) {
      return data
    }
  }

  const { data, error } = await admin
    .from("user_invitations")
    .select("id, email, status, expires_at")
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

function mapInvitationRowToState(
  invitation: PendingInvitationRow,
  authUserEmail: string
): InviteActivationPageState {
  if (invitation.status === "accepted") {
    return {
      status: "already_used",
      message: "Esta invitación ya fue utilizada.",
    }
  }

  if (invitation.status === "revoked") {
    return {
      status: "cancelled",
      message: "Esta invitación fue cancelada.",
    }
  }

  if (
    invitation.status === "expired" ||
    (invitation.status === "pending" &&
      new Date(invitation.expires_at) < new Date())
  ) {
    return {
      status: "expired",
      message: "Esta invitación expiró.",
    }
  }

  if (invitation.status !== "pending") {
    return {
      status: "invalid",
      message: "Enlace inválido.",
    }
  }

  if (normalizeEmail(invitation.email) !== normalizeEmail(authUserEmail)) {
    return {
      status: "invalid",
      message: "Este enlace no corresponde a tu correo.",
    }
  }

  return {
    status: "needs_password",
    email: authUserEmail,
    invitationId: invitation.id,
  }
}

export async function resolveInvitationFailureMessage(
  invitationId: string
): Promise<string> {
  const admin = createAdminClient()

  const { data: invitation, error } = await admin
    .from("user_invitations")
    .select("status, expires_at")
    .eq("id", invitationId)
    .maybeSingle()

  if (error || !invitation) {
    return "Enlace inválido."
  }

  if (invitation.status === "accepted") {
    return "Esta invitación ya fue utilizada."
  }

  if (invitation.status === "revoked") {
    return "Esta invitación fue cancelada."
  }

  if (
    invitation.status === "expired" ||
    (invitation.status === "pending" &&
      new Date(invitation.expires_at) < new Date())
  ) {
    return "Esta invitación expiró."
  }

  return "Enlace inválido."
}

export async function getInviteActivationPageState(input: {
  invitationId: string | null
  authUserId: string | null
  authUserEmail: string | null
  callbackError?: string | null
}): Promise<InviteActivationPageState> {
  const callbackState = mapCallbackError(input.callbackError ?? null)

  if (callbackState) {
    logInviteCallback({
      organizationInvitationFound: false,
      callbackError: input.callbackError,
    })
    return callbackState
  }

  if (!input.authUserId || !input.authUserEmail) {
    logInviteCallback({
      authenticatedUserId: input.authUserId,
      authenticatedEmail: input.authUserEmail,
      organizationInvitationFound: false,
    })

    return {
      status: "unauthenticated",
      message:
        "Abre el enlace desde el correo de invitación para continuar.",
    }
  }

  const invitation = await findPendingOrganizationInvitation({
    invitationId: input.invitationId,
    authUserEmail: input.authUserEmail,
  })

  logInviteCallback({
    authenticatedUserId: input.authUserId,
    authenticatedEmail: input.authUserEmail,
    organizationInvitationFound: Boolean(invitation),
    organizationInvitationStatus: invitation?.status ?? null,
  })

  if (!invitation) {
    return {
      status: "organization_invitation_missing",
      message:
        "No encontramos una invitación pendiente para tu correo. Solicita una nueva invitación.",
    }
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", input.authUserId)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (profile) {
    return {
      status: "already_used",
      message: "Tu cuenta ya está activa.",
    }
  }

  return mapInvitationRowToState(invitation, input.authUserEmail)
}

export function mapCompleteInvitationError(message: string): ValidationError | UnauthorizedError {
  if (message.includes("profile_already_exists")) {
    return new ValidationError("Tu cuenta ya está activa.")
  }

  if (message.includes("invitation_email_mismatch")) {
    return new ValidationError("Este enlace no corresponde a tu correo.")
  }

  if (message.includes("auth_user_not_found")) {
    return new UnauthorizedError(
      "Abre el enlace desde el correo de invitación para continuar."
    )
  }

  if (message.startsWith("invitation_not_found:")) {
    return new ValidationError(message.slice("invitation_not_found:".length))
  }

  if (message.includes("invitation_not_found")) {
    return new ValidationError("Enlace inválido.")
  }

  return new ValidationError("No se pudo activar la cuenta. Inténtalo de nuevo.")
}
