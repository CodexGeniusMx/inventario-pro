import { redirect } from "next/navigation"

import { permissionsFromRows, hasPermission as checkPermission } from "@/lib/auth/permissions"
import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  ForbiddenError,
  InactiveUserError,
  MissingProfileError,
  UnauthorizedError,
} from "@/lib/errors/app-error"
import { createClient } from "@/lib/supabase/server"

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
    .select(
      `
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
          timezone
        )
      `
    )
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

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    organizationId: profile.organization_id,
    organizationName: organization.name,
    organizationSlug: organization.slug,
    organizationTimezone: organization.timezone,
    role: profile.role,
    branchId: profile.branch_id,
    isActive: profile.is_active,
    permissions,
  }
}

export async function getSession(): Promise<AuthenticatedUser | null> {
  try {
    return await loadAuthenticatedUser()
  } catch {
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

  if (user.role !== "admin") {
    throw new ForbiddenError()
  }

  return user
}

export async function requireAdminOrRedirect(
  redirectTo = "/dashboard"
): Promise<AuthenticatedUser> {
  const user = await requireUserOrRedirect("/login")

  if (user.role !== "admin") {
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
  try {
    return await requireUser()
  } catch (error) {
    if (error instanceof InactiveUserError) {
      redirect(`${redirectTo}?error=inactive`)
    }

    if (error instanceof MissingProfileError) {
      redirect(`${redirectTo}?error=missing_profile`)
    }

    redirect(redirectTo)
  }
}
