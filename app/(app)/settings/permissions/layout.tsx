import { SettingsNav } from "@/components/settings/settings-nav"
import { requireRolePermissionsAccessOrRedirect } from "@/lib/auth/session"

export default async function PermissionsSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRolePermissionsAccessOrRedirect()

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <SettingsNav />
      <div>{children}</div>
    </div>
  )
}
