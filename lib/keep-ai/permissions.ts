import type { AuthenticatedUser } from "@/lib/auth/types"
import { canViewProductCosts } from "@/lib/auth/permissions"

export function canViewCostsInKeepAi(user: AuthenticatedUser): boolean {
  return canViewProductCosts(user)
}
