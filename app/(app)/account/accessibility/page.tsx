import { AccessibilitySettingsForm } from "@/components/account/accessibility-settings-form"
import { PageHeader } from "@/components/layout/page-header"

export default function AccountAccessibilityPage() {
  return (
    <>
      <PageHeader
        title="Accesibilidad"
        description="Ajustes personales de lectura, contraste y movimiento."
      />
      <AccessibilitySettingsForm />
    </>
  )
}
