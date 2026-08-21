import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRoleLabel } from "@/lib/auth/roles"
import { EDITABLE_ORG_ROLES } from "@/lib/permissions/catalog"

export function RolePermissionsIndex() {
  return (
    <>
      <PageHeader
        title="Roles y permisos"
        description="Personaliza permisos por rol solo para tu empresa. Los cambios no afectan a otras organizaciones."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {EDITABLE_ORG_ROLES.map((role) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle>{getRoleLabel(role)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/settings/permissions/${role}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Editar permisos
              </Link>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>{getRoleLabel("owner")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              El rol Propietario es inmutable y conserva la autoridad máxima de la
              empresa.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
