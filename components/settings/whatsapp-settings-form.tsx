"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { updateWhatsappSettingsAction } from "@/app/actions/settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { OrganizationSettings } from "@/types/settings"

type WhatsappSettingsFormProps = {
  settings: OrganizationSettings["whatsapp"]
}

export function WhatsappSettingsForm({ settings }: WhatsappSettingsFormProps) {
  const [form, setForm] = useState(settings)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <Card id="whatsapp">
      <CardHeader>
        <CardTitle>WhatsApp Business</CardTitle>
        <CardDescription>
          Configura la identidad comercial del cliente. Los flujos de automatización son administrados por CodexGenius.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) =>
              setForm((current) => ({ ...current, enabled: event.target.checked }))
            }
          />
          Habilitado
        </label>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="whatsapp-number">
            Número comercial
          </label>
          <Input
            id="whatsapp-number"
            value={form.businessNumber ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                businessNumber: event.target.value,
              }))
            }
            placeholder="+52 ..."
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Estado: {form.connected ? "Conectado" : "No conectado"}
        </p>
        {[
          ["Alertas de stock bajo", "lowStockAlerts"],
          ["Alertas de sin stock", "outOfStockAlerts"],
          ["Resumen diario de ventas", "dailySalesSummary"],
          ["Notificaciones de compra recibida", "purchaseReceivedAlerts"],
          ["Recordatorios de compras pendientes", "pendingPurchaseReminders"],
          ["Consultas Keep AI por WhatsApp", "keepAiQueries"],
        ].map(([label, key]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form[key as keyof typeof form] as boolean}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [key]: event.target.checked,
                }))
              }
            />
            {label}
          </label>
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Button
          isDisabled={isPending}
          onPress={() => {
            setError(null)
            setMessage(null)
            startTransition(async () => {
              const result = await updateWhatsappSettingsAction(form)
              if (!result.success) {
                setError(result.error.message)
                return
              }
              setMessage(result.data.message)
            })
          }}
        >
          {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar WhatsApp
        </Button>
      </CardContent>
    </Card>
  )
}
