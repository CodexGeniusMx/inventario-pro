import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OrganizationSettings } from "@/types/settings"

type DocumentsSettingsPanelProps = {
  prefixes: OrganizationSettings["documentPrefixes"]
}

export function DocumentsSettingsPanel({ prefixes }: DocumentsSettingsPanelProps) {
  const rows = [
    { label: "Compra", value: prefixes.purchaseOrder },
    { label: "Venta", value: prefixes.sale },
    { label: "Ajuste", value: prefixes.stockAdjustment },
    { label: "Devolución", value: prefixes.return },
    { label: "Recepción de compra", value: prefixes.purchaseReceipt },
  ]

  return (
    <Card id="documentos">
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
        <CardDescription>
          Prefijos actuales de numeración. La secuencia se administra de forma segura en el servidor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
          >
            <span>{row.label}</span>
            <span className="font-mono text-muted-foreground">{row.value}0001</span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          La edición de prefijos se habilitará en una fase futura sin comprometer la unicidad de documentos.
        </p>
      </CardContent>
    </Card>
  )
}
