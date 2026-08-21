import { RolePermissionsIndex } from "@/components/permissions/role-permissions-index"
import { requireRolePermissionsAccessOrRedirect } from "@/lib/auth/session"

export default async function RolePermissionsPage() {
  await requireRolePermissionsAccessOrRedirect()

  return <RolePermissionsIndex />
}
