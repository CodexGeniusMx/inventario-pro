import { NextResponse } from "next/server"

import {
  establishInviteAuthSession,
  logInviteCallback,
  parseInviteCallbackDestination,
} from "@/lib/auth/invite-session"

function buildAcceptInviteErrorRedirect(
  origin: string,
  destination: string,
  errorCode: string
) {
  const url = new URL(destination, origin)
  url.searchParams.set("error", errorCode)
  return NextResponse.redirect(url.toString())
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
  const invitationId = requestUrl.searchParams.get("invitation")
  const next = requestUrl.searchParams.get("next")
  const supabaseError = requestUrl.searchParams.get("error")
  const supabaseErrorDescription =
    requestUrl.searchParams.get("error_description")
  const destination = parseInviteCallbackDestination({ invitationId, next })
  const origin = requestUrl.origin

  logInviteCallback({
    callbackReached: true,
    codePresent: Boolean(code),
    tokenHashPresent: Boolean(tokenHash),
    type,
    invitationIdPresent: Boolean(invitationId),
    supabaseError,
    supabaseErrorDescription,
  })

  if (supabaseError) {
    logInviteCallback({
      authExchangeSuccess: false,
      failureReason: "supabase_redirect_error",
      finalRedirectDestination: `${destination}?error=auth_callback_config`,
    })

    return buildAcceptInviteErrorRedirect(
      origin,
      destination,
      "auth_callback_config"
    )
  }

  const sessionResult = await establishInviteAuthSession({
    code,
    tokenHash,
    type,
  })

  if (!sessionResult.success) {
    logInviteCallback({
      authExchangeSuccess: false,
      failureReason: sessionResult.reason,
      authCode: sessionResult.authCode,
      authStatus: sessionResult.authStatus,
      finalRedirectDestination: `${destination}?error=auth_callback_exchange`,
    })

    return buildAcceptInviteErrorRedirect(
      origin,
      destination,
      sessionResult.reason === "missing_credentials"
        ? "auth_callback_missing"
        : "auth_callback_exchange"
    )
  }

  logInviteCallback({
    authExchangeSuccess: true,
    authExchangeMethod: sessionResult.method,
    authenticatedUserId: sessionResult.userId,
    authenticatedEmail: sessionResult.email,
    finalRedirectDestination: destination,
  })

  return NextResponse.redirect(new URL(destination, origin).toString())
}
