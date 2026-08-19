type ErrorLike = {
  message?: unknown
  status?: unknown
  code?: unknown
  name?: unknown
  details?: unknown
  hint?: unknown
}

function asErrorLike(error: unknown): ErrorLike {
  if (error && typeof error === "object") {
    return error as ErrorLike
  }

  return { message: String(error) }
}

export function logInviteUserError(error: unknown): void {
  const err = asErrorLike(error)

  console.error("[invite-user-error]", {
    message: err.message,
    status: err.status,
    code: err.code,
    name: err.name,
  })
}

export function logInvitationDbError(error: unknown): void {
  const err = asErrorLike(error)

  console.error("[invitation-db-error]", {
    message: err.message,
    code: err.code,
    details: err.details,
    hint: err.hint,
  })
}

export function mapInvitationErrorMessage(error: unknown): string | null {
  const err = asErrorLike(error)
  const message =
    typeof err.message === "string" ? err.message.toLowerCase() : ""
  const code = typeof err.code === "string" ? err.code : ""
  const status = typeof err.status === "number" ? err.status : null

  if (code === "23505") {
    return "Ya existe una invitación pendiente para este correo."
  }

  if (
    code === "email_exists" ||
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("user already exists")
  ) {
    return "Este correo ya pertenece a un usuario."
  }

  if (
    code === "over_email_send_rate_limit" ||
    status === 429 ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("too many emails")
  ) {
    return "No se pudo enviar el correo de invitación. Inténtalo más tarde."
  }

  if (
    message.includes("smtp") ||
    message.includes("mailer") ||
    message.includes("email address is invalid") ||
    message.includes("not authorized to send") ||
    message.includes("email not allowed") ||
    message.includes("error sending invite email") ||
    message.includes("error sending confirmation email")
  ) {
    return "El servicio de correo no permite enviar invitaciones a esta dirección."
  }

  return null
}
