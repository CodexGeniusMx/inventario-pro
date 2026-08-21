import { NotificationSettingsForm } from "@/components/account/notification-settings-form"
import { PageHeader } from "@/components/layout/page-header"
import { requireUserOrRedirect } from "@/lib/auth/session"
import { getUserPreferences } from "@/services/preferences/user-preferences.service"

export default async function AccountNotificationsPage() {
  const user = await requireUserOrRedirect("/login")
  const preferences = await getUserPreferences(user)

  return (
    <>
      <PageHeader
        title="Notificaciones"
        description="Preferencias personales de avisos. Los canales no implementados se muestran como próximamente."
      />
      <NotificationSettingsForm preferences={preferences} />
    </>
  )
}
