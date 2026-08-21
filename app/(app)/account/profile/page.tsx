import { ProfileSettingsForm } from "@/components/account/profile-settings-form"
import { PageHeader } from "@/components/layout/page-header"
import { requireUserOrRedirect } from "@/lib/auth/session"
import { getProfileSummary } from "@/services/preferences/user-preferences.service"

export default async function AccountProfilePage() {
  const user = await requireUserOrRedirect("/login")

  return (
    <>
      <PageHeader
        title="Mi perfil"
        description="Información personal de tu cuenta. Esto no modifica la configuración de la empresa."
      />
      <ProfileSettingsForm profile={getProfileSummary(user)} />
    </>
  )
}
