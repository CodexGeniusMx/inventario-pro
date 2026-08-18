import { requireUsersAccessOrRedirect } from "@/lib/auth/session"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InviteUserForm } from "@/components/users/invite-user-form"
import { UsersTable } from "@/components/users/users-table"
import { getRoleLabel } from "@/lib/auth/roles"
import { invitationStatusLabel } from "@/lib/i18n/status-labels"
import {
  listOrganizationUsers,
  listPendingInvitations,
} from "@/services/users/user.service"

export default async function UsersPage() {
  const user = await requireUsersAccessOrRedirect()
  const [users, invitations] = await Promise.all([
    listOrganizationUsers(user),
    listPendingInvitations(user),
  ])

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Invita empleados y asigna roles sin acceder a Supabase."
      />

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <InviteUserForm />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Equipo</CardTitle>
            </CardHeader>
            <CardContent>
              <UsersTable users={users} />
            </CardContent>
          </Card>

          {invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Invitaciones pendientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between rounded-xl border px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-muted-foreground">
                        {getRoleLabel(invitation.role)} · expira{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                    <span className="text-muted-foreground">
                      {invitationStatusLabel(invitation.status)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
