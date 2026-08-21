import { AppearanceSettingsForm } from "@/components/account/appearance-settings-form"
import { PageHeader } from "@/components/layout/page-header"

export default function AccountAppearancePage() {
  return (
    <>
      <PageHeader
        title="Apariencia"
        description="Tema y densidad personal. Cada usuario elige su propia experiencia visual."
      />
      <AppearanceSettingsForm />
    </>
  )
}
