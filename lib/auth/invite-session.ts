import type { EmailOtpType } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

const INVITE_OTP_TYPES = new Set<EmailOtpType>([
  "invite",
  "signup",
  "magiclink",
  "email",
  "recovery",
])

export type InviteSessionParams = {
  code?: string | null
  tokenHash?: string | null
  type?: string | null
}

export type InviteSessionResult =
  | {
      success: true
      userId: string
      email: string
      method: "code" | "token_hash"
    }
  | {
      success: false
      reason:
        | "missing_credentials"
        | "unsupported_type"
        | "exchange_failed"
      message: string
      authCode?: string
      authStatus?: number
    }

function isInviteCallbackLoggingEnabled(): boolean {
  return process.env.NODE_ENV === "development"
}

export function logInviteCallback(event: Record<string, unknown>): void {
  if (!isInviteCallbackLoggingEnabled()) {
    return
  }

  console.info("[invite-callback]", event)
}

export function parseInviteCallbackDestination(input: {
  invitationId: string | null
  next: string | null
}): string {
  if (input.invitationId && /^[0-9a-f-]{36}$/i.test(input.invitationId)) {
    return `/accept-invite?invitation=${input.invitationId}`
  }

  if (input.next?.startsWith("/") && !input.next.startsWith("//")) {
    return input.next
  }

  return "/accept-invite"
}

export async function establishInviteAuthSession(
  params: InviteSessionParams
): Promise<InviteSessionResult> {
  const supabase = await createClient()

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code)

    if (error || !data.user?.email) {
      return {
        success: false,
        reason: "exchange_failed",
        message: error?.message ?? "No se pudo establecer la sesión de invitación.",
        authCode: error?.code,
        authStatus: error?.status,
      }
    }

    return {
      success: true,
      userId: data.user.id,
      email: data.user.email,
      method: "code",
    }
  }

  if (params.tokenHash && params.type) {
    if (!INVITE_OTP_TYPES.has(params.type as EmailOtpType)) {
      return {
        success: false,
        reason: "unsupported_type",
        message: "Tipo de invitación no soportado.",
      }
    }

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: params.tokenHash,
      type: params.type as EmailOtpType,
    })

    if (error || !data.user?.email) {
      return {
        success: false,
        reason: "exchange_failed",
        message: error?.message ?? "No se pudo validar la invitación.",
        authCode: error?.code,
        authStatus: error?.status,
      }
    }

    return {
      success: true,
      userId: data.user.id,
      email: data.user.email,
      method: "token_hash",
    }
  }

  return {
    success: false,
    reason: "missing_credentials",
    message: "Faltan credenciales de invitación.",
  }
}
