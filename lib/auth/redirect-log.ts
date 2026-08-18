type AuthRedirectLogContext = {
  pathname?: string
  userId?: string | null
  profileFound?: boolean
  organizationFound?: boolean
  role?: string
  requiredPermission?: string
  destination: string
  reason: string
}

export function logAuthRedirect(context: AuthRedirectLogContext): void {
  if (process.env.NODE_ENV === "production") {
    return
  }

  console.warn("[auth-redirect]", {
    pathname: context.pathname ?? "unknown",
    userId: context.userId ?? null,
    profileFound: context.profileFound ?? null,
    organizationFound: context.organizationFound ?? null,
    role: context.role ?? null,
    requiredPermission: context.requiredPermission ?? null,
    destination: context.destination,
    reason: context.reason,
  })
}

export function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false
  }

  const record = error as { code?: string; message?: string }
  const message = record.message?.toLowerCase() ?? ""

  return (
    record.code === "42703" ||
    record.code === "PGRST204" ||
    (message.includes("column") && message.includes("does not exist")) ||
    (message.includes("could not find") && message.includes("column"))
  )
}

export const PENDING_COMMERCIAL_MIGRATIONS = [
  "00026_commercial_hardening_schema.sql",
  "00027_commercial_hardening_permissions.sql",
] as const
