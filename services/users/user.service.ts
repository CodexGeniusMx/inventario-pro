import type { AuthenticatedUser } from "@/lib/auth/types"
import { hasPermission, isAdmin } from "@/lib/auth/permissions"
import type { AppRole } from "@/lib/auth/types"
import { INVITABLE_ROLES } from "@/lib/auth/roles"
import { ForbiddenError, ValidationError } from "@/lib/errors/app-error"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { OrganizationUser, UserInvitation } from "@/types/settings"

function assertUserManagement(user: AuthenticatedUser): void {
  if (
    isAdmin(user) ||
    hasPermission(user, "users", "invite") ||
    hasPermission(user, "users", "write")
  ) {
    return
  }

  throw new ForbiddenError()
}

export async function listOrganizationUsers(
  user: AuthenticatedUser
): Promise<OrganizationUser[]> {
  assertUserManagement(user)

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, created_at")
    .eq("organization_id", user.organizationId)
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  const { data: authUsers, error: authError } =
    await admin.auth.admin.listUsers()

  if (authError) {
    throw authError
  }

  const emailById = new Map(
    authUsers.users.map((authUser) => [authUser.id, authUser.email ?? ""])
  )

  return (profiles ?? []).map((profile) => ({
    id: profile.id,
    fullName: profile.full_name,
    email: emailById.get(profile.id) ?? "",
    role: profile.role,
    isActive: profile.is_active,
    createdAt: profile.created_at,
  }))
}

export async function listPendingInvitations(
  user: AuthenticatedUser
): Promise<UserInvitation[]> {
  assertUserManagement(user)

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_invitations")
    .select(
      `
        id,
        email,
        role,
        status,
        expires_at,
        created_at,
        invited_by,
        profiles!user_invitations_invited_by_fkey ( full_name )
      `
    )
    .eq("organization_id", user.organizationId)
    .in("status", ["pending", "expired"])
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status as UserInvitation["status"],
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    invitedByName:
      (row.profiles as { full_name: string } | null)?.full_name ?? null,
  }))
}

export type InviteUserInput = {
  email: string
  role: AppRole
  warehouseId?: string | null
}

export async function inviteOrganizationUser(
  user: AuthenticatedUser,
  input: InviteUserInput
): Promise<UserInvitation> {
  assertUserManagement(user)

  const email = input.email.trim().toLowerCase()

  if (!email.includes("@")) {
    throw new ValidationError("Ingresa un correo electrónico válido.")
  }

  if (!INVITABLE_ROLES.includes(input.role)) {
    throw new ValidationError("El rol seleccionado no se puede asignar.")
  }

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: invitation, error: insertError } = await supabase
    .from("user_invitations")
    .insert({
      organization_id: user.organizationId,
      email,
      role: input.role,
      warehouse_id: input.warehouseId ?? null,
      invited_by: user.id,
      status: "pending",
    })
    .select("id, email, role, status, expires_at, created_at")
    .single()

  if (insertError) {
    throw insertError
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${siteUrl}/accept-invite?invitation=${invitation.id}`,
      data: {
        invitation_id: invitation.id,
        organization_id: user.organizationId,
        role: input.role,
      },
    }
  )

  if (inviteError) {
    await supabase.from("user_invitations").delete().eq("id", invitation.id)
    throw inviteError
  }

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status as UserInvitation["status"],
    expiresAt: invitation.expires_at,
    createdAt: invitation.created_at,
    invitedByName: user.fullName,
  }
}

export async function completeInvitation(
  invitationId: string
): Promise<string> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("complete_user_invitation", {
    p_invitation_id: invitationId,
  })

  if (error) {
    throw error
  }

  return data as string
}

export async function updateUserRole(
  user: AuthenticatedUser,
  targetUserId: string,
  role: AppRole
): Promise<void> {
  if (
    !isAdmin(user) &&
    !hasPermission(user, "users", "change_role") &&
    !hasPermission(user, "users", "write")
  ) {
    throw new ForbiddenError()
  }

  if (targetUserId === user.id) {
    throw new ValidationError("No puedes cambiar tu propio rol.")
  }

  if (role === "owner" && user.role !== "owner") {
    throw new ForbiddenError(
      "Solo un propietario puede asignar el rol de propietario."
    )
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", targetUserId)
    .eq("organization_id", user.organizationId)

  if (error) {
    throw error
  }
}

export async function setUserActiveState(
  user: AuthenticatedUser,
  targetUserId: string,
  isActive: boolean
): Promise<void> {
  if (
    !isAdmin(user) &&
    !hasPermission(user, "users", "deactivate") &&
    !hasPermission(user, "users", "write")
  ) {
    throw new ForbiddenError()
  }

  if (targetUserId === user.id) {
    throw new ValidationError("No puedes desactivar tu propia cuenta.")
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", targetUserId)
    .eq("organization_id", user.organizationId)

  if (error) {
    throw error
  }
}
