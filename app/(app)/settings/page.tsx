import { requireAdminOrRedirect } from "@/lib/auth/session"
import { PlaceholderPage } from "@/components/layout/placeholder-page"

export default async function SettingsPage() {
  await requireAdminOrRedirect()

  return (
    <PlaceholderPage
      title="Settings"
      description="Organization settings, warehouses, and integrations."
    />
  )
}
