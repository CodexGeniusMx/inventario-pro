import { requireSettingsAccessOrRedirect } from "@/lib/auth/session"
import { PageHeader } from "@/components/layout/page-header"
import { AiSettingsForm } from "@/components/settings/ai-settings-form"
import { AutomationsSupportPanel } from "@/components/settings/automations-support-panel"
import { CompanySettingsForm } from "@/components/settings/company-settings-form"
import { CurrencySettingsForm } from "@/components/settings/currency-settings-form"
import { DocumentsSettingsPanel } from "@/components/settings/documents-settings-panel"
import { InventorySettingsForm } from "@/components/settings/inventory-settings-form"
import { SettingsNav } from "@/components/settings/settings-nav"
import { WhatsappSettingsForm } from "@/components/settings/whatsapp-settings-form"
import { listWarehouses } from "@/services/inventory/warehouse.service"
import { getOrganizationSettings } from "@/services/settings/organization.service"

export default async function SettingsPage() {
  const user = await requireSettingsAccessOrRedirect()
  const [settings, warehouses] = await Promise.all([
    getOrganizationSettings(user),
    listWarehouses(user),
  ])

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Administra empresa, monedas, inventario, Keep AI y WhatsApp."
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="space-y-6">
          <CompanySettingsForm settings={settings} />
          <CurrencySettingsForm
            baseCurrency={settings.baseCurrency}
            allowedCurrencies={settings.allowedCurrencies}
          />
          <InventorySettingsForm
            defaultWarehouseId={settings.defaultWarehouseId}
            warehouses={warehouses}
          />
          <DocumentsSettingsPanel prefixes={settings.documentPrefixes} />
          <AiSettingsForm settings={settings.ai} />
          <WhatsappSettingsForm settings={settings.whatsapp} />
          <AutomationsSupportPanel />
        </div>
      </div>
    </>
  )
}
