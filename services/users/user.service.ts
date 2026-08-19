import type { AuthenticatedUser } from "@/lib/auth/types"
import { hasPermission, isAdmin } from "@/lib/auth/permissions"
import type { AppRole } from "@/lib/auth/types"
import { INVITABLE_ROLES } from "@/lib/auth/roles"
import {
  mapCompleteInvitationError,
  resolveInvitationFailureMessage,
} from "@/lib/auth/invite-activation"
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/app-error"
import {
  logInvitationDbError,
  logInviteUserError,
} from "@/lib/errors/invitation-error-mapping"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { OrganizationUser, UserInvitation } from "@/types/settings"
import type { User } from "@supabase/supabase-js"

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

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

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
}

function getInvitationRedirectUrl(invitationId: string): string {
  return `${getSiteUrl()}/auth/callback?invitation=${invitationId}`
}

function getInvitationExpiryDate(): string {
  return new Date(Date.now() + INVITATION_TTL_MS).toISOString()
}

async function findAuthUserByEmail(
  email: string
): Promise<User | null> {
  const admin = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()
  let page = 1

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })

    if (error) {
      throw error
    }

    const match = data.users.find(
      (authUser) => authUser.email?.trim().toLowerCase() === normalizedEmail
    )

    if (match) {
      return match
    }

    if (data.users.length < 200) {
      return null
    }

    page += 1
  }
}

async function assertNoActiveProfileForAuthUser(
  authUserId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", authUserId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (profile) {
    throw new ConflictError(
      "Este correo ya pertenece a un usuario activo de la organización."
    )
  }
}

async function removeOrphanInvitedAuthUser(email: string): Promise<void> {
  const authUser = await findAuthUserByEmail(email)

  if (!authUser) {
    return
  }

  await assertNoActiveProfileForAuthUser(authUser.id)

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(authUser.id)

  if (error) {
    throw error
  }
}

type InvitationEmailPayload = {
  id: string
  email: string
  role: AppRole
  organizationId: string
}

async function sendInvitationEmail(
  invitation: InvitationEmailPayload,
  options: { allowRecreateAuthUser?: boolean } = {}
): Promise<void> {
  const admin = createAdminClient()
  const inviteOptions = {
    redirectTo: getInvitationRedirectUrl(invitation.id),
    data: {
      invitation_id: invitation.id,
      organization_id: invitation.organizationId,
      role: invitation.role,
    },
  }

  const { error } = await admin.auth.admin.inviteUserByEmail(
    invitation.email,
    inviteOptions
  )

  if (!error) {
    return
  }

  logInviteUserError(error)

  if (!options.allowRecreateAuthUser) {
    throw error
  }

  const authUser = await findAuthUserByEmail(invitation.email)

  if (!authUser) {
    throw error
  }

  await assertNoActiveProfileForAuthUser(authUser.id)
  await admin.auth.admin.deleteUser(authUser.id)

  const { error: retryError } = await admin.auth.admin.inviteUserByEmail(
    invitation.email,
    inviteOptions
  )

  if (retryError) {
    logInviteUserError(retryError)
    throw retryError
  }
}

async function getPendingInvitationForOrganization(
  user: AuthenticatedUser,
  invitationId: string
) {
  const supabase = await createClient()

  const { data: invitation, error } = await supabase
    .from("user_invitations")
    .select("id, email, role, status, organization_id, warehouse_id, expires_at")
    .eq("id", invitationId)
    .eq("organization_id", user.organizationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!invitation) {
    throw new NotFoundError("Invitación no encontrada.")
  }

  if (invitation.status !== "pending") {
    throw new ValidationError("Solo se pueden gestionar invitaciones pendientes.")
  }

  return invitation
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
    logInvitationDbError(insertError)
    throw insertError
  }

  try {
    await sendInvitationEmail({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organizationId: user.organizationId,
    })
  } catch (inviteError) {
    const { error: rollbackError } = await supabase
      .from("user_invitations")
      .delete()
      .eq("id", invitation.id)

    if (rollbackError) {
      logInvitationDbError(rollbackError)
    }

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
    if (error.message.includes("invitation_not_found")) {
      throw mapCompleteInvitationError(
        `invitation_not_found:${await resolveInvitationFailureMessage(invitationId)}`
      )
    }

    throw mapCompleteInvitationError(error.message)
  }

  return data as string
}

export async function cancelOrganizationInvitation(
  user: AuthenticatedUser,
  invitationId: string
): Promise<void> {
  assertUserManagement(user)

  const invitation = await getPendingInvitationForOrganization(
    user,
    invitationId
  )
  const supabase = await createClient()

  const { data: revokedInvitation, error: revokeError } = await supabase
    .from("user_invitations")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", invitation.id)
    .eq("organization_id", user.organizationId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (revokeError) {
    logInvitationDbError(revokeError)
    throw revokeError
  }

  if (!revokedInvitation) {
    throw new ValidationError("La invitación ya no está pendiente.")
  }

  await removeOrphanInvitedAuthUser(invitation.email)
}

export async function resendOrganizationInvitation(
  user: AuthenticatedUser,
  invitationId: string
): Promise<void> {
  assertUserManagement(user)

  const invitation = await getPendingInvitationForOrganization(
    user,
    invitationId
  )
  const supabase = await createClient()

  const authUser = await findAuthUserByEmail(invitation.email)

  if (authUser) {
    await assertNoActiveProfileForAuthUser(authUser.id)
  }

  const { data: updatedInvitation, error: updateError } = await supabase
    .from("user_invitations")
    .update({
      expires_at: getInvitationExpiryDate(),
    })
    .eq("id", invitation.id)
    .eq("organization_id", user.organizationId)
    .eq("status", "pending")
    .select("id, email, role, organization_id")
    .maybeSingle()

  if (updateError) {
    logInvitationDbError(updateError)
    throw updateError
  }

  if (!updatedInvitation) {
    throw new ValidationError("La invitación ya no está pendiente.")
  }

  await sendInvitationEmail(
    {
      id: updatedInvitation.id,
      email: updatedInvitation.email,
      role: updatedInvitation.role,
      organizationId: updatedInvitation.organization_id,
    },
    { allowRecreateAuthUser: true }
  )
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
