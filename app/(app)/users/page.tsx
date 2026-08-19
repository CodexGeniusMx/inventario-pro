import { requireUsersAccessOrRedirect } from "@/lib/auth/session"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InviteUserForm } from "@/components/users/invite-user-form"
import { PendingInvitationsList } from "@/components/users/pending-invitations-list"
import { UsersTable } from "@/components/users/users-table"
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
              <CardContent>
                <PendingInvitationsList invitations={invitations} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
