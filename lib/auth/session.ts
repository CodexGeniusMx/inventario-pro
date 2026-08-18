import { redirect } from "next/navigation"
import { headers } from "next/headers"

import {
  permissionsFromRows,
  hasPermission as checkPermission,
  isAdmin as checkIsAdmin,
  canManageSettings,
  canManageUsers,
} from "@/lib/auth/permissions"
import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  normalizeAllowedCurrencies,
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency/types"
import {
  ForbiddenError,
  InactiveUserError,
  MissingProfileError,
  UnauthorizedError,
} from "@/lib/errors/app-error"
import {
  isMissingSchemaError,
  logAuthRedirect,
  PENDING_COMMERCIAL_MIGRATIONS,
} from "@/lib/auth/redirect-log"
import { createClient } from "@/lib/supabase/server"

const BASE_PROFILE_SELECT = `
  id,
  full_name,
  role,
  is_active,
  branch_id,
  organization_id,
  organizations (
    id,
    name,
    slug,
    timezone,
    currency_code
  )
`

const EXTENDED_ORG_SELECT = `
  allowed_currencies,
  default_warehouse_id,
  ai_enabled,
  ai_allow_queries,
  ai_allow_prepare,
  ai_require_confirmation
`

type BaseProfileRow = {
  id: string
  full_name: string
  role: AuthenticatedUser["role"]
  is_active: boolean
  branch_id: string | null
  organization_id: string
  organizations: {
    id: string
    name: string
    slug: string
    timezone: string
    currency_code: string
  } | null
}

type ExtendedOrgRow = {
  allowed_currencies: string[] | null
  default_warehouse_id: string | null
  ai_enabled: boolean | null
  ai_allow_queries: boolean | null
  ai_allow_prepare: boolean | null
  ai_require_confirmation: boolean | null
}

function mapAuthenticatedUser(
  authUser: { id: string; email?: string | null },
  profile: BaseProfileRow,
  permissions: AuthenticatedUser["permissions"],
  extendedOrg?: ExtendedOrgRow | null
): AuthenticatedUser {
  const organization = profile.organizations!

  const baseCurrency: SupportedCurrency = isSupportedCurrency(
    organization.currency_code
  )
    ? organization.currency_code
    : "MXN"

  const allowedCurrencies = normalizeAllowedCurrencies(
    extendedOrg?.allowed_currencies ?? [baseCurrency]
  )

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    fullName: profile.full_name,
    organizationId: profile.organization_id,
    organizationName: organization.name,
    organizationSlug: organization.slug,
    organizationTimezone: organization.timezone,
    organizationBaseCurrency: baseCurrency,
    organizationAllowedCurrencies: allowedCurrencies,
    defaultWarehouseId: extendedOrg?.default_warehouse_id ?? null,
    role: profile.role,
    branchId: profile.branch_id,
    isActive: profile.is_active,
    permissions,
    aiEnabled: extendedOrg?.ai_enabled ?? true,
    aiAllowQueries: extendedOrg?.ai_allow_queries ?? true,
    aiAllowPrepare: extendedOrg?.ai_allow_prepare ?? true,
    aiRequireConfirmation: extendedOrg?.ai_require_confirmation ?? true,
  }
}

async function loadExtendedOrganizationSettings(
  organizationId: string
): Promise<ExtendedOrgRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("organizations")
    .select(EXTENDED_ORG_SELECT)
    .eq("id", organizationId)
    .maybeSingle()

  if (error) {
    if (isMissingSchemaError(error)) {
      console.warn(
        "[auth-session] Commercial hardening migrations not applied yet. Using defaults.",
        { migrations: PENDING_COMMERCIAL_MIGRATIONS }
      )
      return null
    }

    throw error
  }

  return data
}

async function loadAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(BASE_PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (!profile) {
    return null
  }

  if (!profile.is_active) {
    throw new InactiveUserError()
  }

  const organization = profile.organizations

  if (!organization) {
    return null
  }

  const { data: permissionRows, error: permissionsError } = await supabase
    .from("role_permissions")
    .select(
      `
        permissions (
          resource,
          action
        )
      `
    )
    .eq("role", profile.role)

  if (permissionsError) {
    throw permissionsError
  }

  const permissions = permissionsFromRows(permissionRows ?? [])
  const extendedOrg = await loadExtendedOrganizationSettings(
    profile.organization_id
  )

  return mapAuthenticatedUser(user, profile, permissions, extendedOrg)
}

async function getCurrentPathname(): Promise<string> {
  const headerStore = await headers()
  return headerStore.get("x-pathname") ?? headerStore.get("x-url") ?? "unknown"
}

export async function getSession(): Promise<AuthenticatedUser | null> {
  try {
    return await loadAuthenticatedUser()
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.warn(
        "[auth-session] Session load blocked by missing schema.",
        { migrations: PENDING_COMMERCIAL_MIGRATIONS, error }
      )
    }

    return null
  }
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await loadAuthenticatedUser()

  if (!user) {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      throw new UnauthorizedError()
    }

    throw new MissingProfileError()
  }

  return user
}

export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireUser()

  if (!checkIsAdmin(user)) {
    throw new ForbiddenError()
  }

  return user
}

export async function requireAdminOrRedirect(
  redirectTo = "/dashboard"
): Promise<AuthenticatedUser> {
  const user = await requireUserOrRedirect("/login")

  if (!checkIsAdmin(user)) {
    logAuthRedirect({
      pathname: await getCurrentPathname(),
      userId: user.id,
      profileFound: true,
      organizationFound: true,
      role: user.role,
      destination: redirectTo,
      reason: "User is not org admin (owner/admin).",
    })
    redirect(redirectTo)
  }

  return user
}

export async function requireSettingsAccessOrRedirect(
  redirectTo = "/dashboard"
): Promise<AuthenticatedUser> {
  const user = await requireUserOrRedirect("/login")

  if (!canManageSettings(user)) {
    logAuthRedirect({
      pathname: await getCurrentPathname(),
      userId: user.id,
      profileFound: true,
      organizationFound: true,
      role: user.role,
      requiredPermission: "settings.*",
      destination: redirectTo,
      reason: "User lacks settings permissions.",
    })
    redirect(redirectTo)
  }

  return user
}

export async function requireUsersAccessOrRedirect(
  redirectTo = "/dashboard"
): Promise<AuthenticatedUser> {
  const user = await requireUserOrRedirect("/login")

  if (!canManageUsers(user)) {
    logAuthRedirect({
      pathname: await getCurrentPathname(),
      userId: user.id,
      profileFound: true,
      organizationFound: true,
      role: user.role,
      requiredPermission: "users.*",
      destination: redirectTo,
      reason: "User lacks user-management permissions.",
    })
    redirect(redirectTo)
  }

  return user
}

export async function requirePermission(
  resource: string,
  action: string
): Promise<AuthenticatedUser> {
  const user = await requireUser()

  if (!checkPermission(user, resource, action)) {
    throw new ForbiddenError()
  }

  return user
}

export async function requireUserOrRedirect(
  redirectTo = "/login"
): Promise<AuthenticatedUser> {
  const pathname = await getCurrentPathname()

  try {
    return await requireUser()
  } catch (error) {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (error instanceof InactiveUserError) {
      logAuthRedirect({
        pathname,
        userId: authUser?.id ?? null,
        profileFound: Boolean(authUser),
        destination: `${redirectTo}?error=inactive`,
        reason: "User profile is inactive.",
      })
      redirect(`${redirectTo}?error=inactive`)
    }

    if (error instanceof MissingProfileError) {
      logAuthRedirect({
        pathname,
        userId: authUser?.id ?? null,
        profileFound: false,
        destination: `${redirectTo}?error=missing_profile`,
        reason: "Authenticated auth user has no profile row.",
      })
      redirect(`${redirectTo}?error=missing_profile`)
    }

    if (authUser && isMissingSchemaError(error)) {
      logAuthRedirect({
        pathname,
        userId: authUser.id,
        profileFound: true,
        destination: pathname,
        reason:
          "Database schema missing commercial hardening migrations; avoid login redirect loop.",
      })
      throw error
    }

    logAuthRedirect({
      pathname,
      userId: authUser?.id ?? null,
      profileFound: Boolean(authUser),
      destination: redirectTo,
      reason:
        error instanceof Error ? error.message : "Unknown auth guard failure.",
    })

    if (authUser) {
      throw error
    }

    redirect(redirectTo)
  }
}
