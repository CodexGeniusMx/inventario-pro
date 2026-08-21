import { notFound } from "next/navigation"

import { RolePermissionEditor } from "@/components/permissions/role-permission-editor"
import { PageHeader } from "@/components/layout/page-header"
import { requireRolePermissionsAccessOrRedirect } from "@/lib/auth/session"
import type { AppRole } from "@/lib/auth/types"
import { EDITABLE_ORG_ROLES } from "@/lib/permissions/catalog"
import { getRolePermissionMatrix } from "@/services/permissions/role-permissions.service"

type RolePermissionsDetailPageProps = {
  params: Promise<{ role: string }>
}

export default async function RolePermissionsDetailPage({
  params,
}: RolePermissionsDetailPageProps) {
  const user = await requireRolePermissionsAccessOrRedirect()
  const { role } = await params

  if (!EDITABLE_ORG_ROLES.includes(role as AppRole)) {
    notFound()
  }

  const matrix = await getRolePermissionMatrix(user, role as AppRole)

  return (
    <>
      <PageHeader
        title="Editar permisos"
        description="Los cambios aplican solo a tu organización."
      />
      <RolePermissionEditor matrix={matrix} />
    </>
  )
}
