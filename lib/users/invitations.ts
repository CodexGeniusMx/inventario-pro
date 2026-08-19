import type { UserInvitation } from "@/types/settings"

export function getEffectiveInvitationStatus(
  invitation: Pick<UserInvitation, "status" | "expiresAt">
): UserInvitation["status"] {
  if (invitation.status !== "pending") {
    return invitation.status
  }

  return new Date(invitation.expiresAt) < new Date() ? "expired" : "pending"
}
