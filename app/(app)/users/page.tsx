import { requireAdminOrRedirect } from "@/lib/auth/session"
import { PlaceholderPage } from "@/components/layout/placeholder-page"

export default async function UsersPage() {
  await requireAdminOrRedirect()

  return (
    <PlaceholderPage
      title="Users"
      description="Invite users and assign Admin or Employee roles."
    />
  )
}
