import { SecuritySettingsPanel } from "@/components/account/security-settings-panel"
import { PageHeader } from "@/components/layout/page-header"

export default function AccountSecurityPage() {
  return (
    <>
      <PageHeader
        title="Seguridad"
        description="Información de seguridad de tu cuenta personal."
      />
      <SecuritySettingsPanel />
    </>
  )
}
