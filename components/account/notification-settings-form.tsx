"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { updateNotificationPreferencesAction } from "@/app/actions/account"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { UserPreferences } from "@/lib/preferences/types"

type NotificationSettingsFormProps = {
  preferences: UserPreferences
}

export function NotificationSettingsForm({
  preferences,
}: NotificationSettingsFormProps) {
  const [notificationsInApp, setNotificationsInApp] = useState(
    preferences.notificationsInApp
  )
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificaciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Switch
          isSelected={notificationsInApp}
          onChange={setNotificationsInApp}
          label="Notificaciones en la aplicación"
          description="Recibir avisos dentro de Keep Inventory cuando estén disponibles."
        />

        <div className="rounded-xl border border-dashed p-4">
          <p className="text-sm font-medium">Correo electrónico</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Próximamente. La infraestructura de envío aún no está implementada en
            esta fase.
          </p>
        </div>

        <div className="rounded-xl border border-dashed p-4">
          <p className="text-sm font-medium">WhatsApp</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Próximamente. Las preferencias personales de WhatsApp se habilitarán
            cuando la integración esté lista.
          </p>
        </div>

        <div className="rounded-xl border border-dashed p-4">
          <p className="text-sm font-medium">Horario silencioso</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Modelo preparado para una fase posterior. No hay controles activos todavía.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <Button
          isDisabled={isPending}
          onPress={() => {
            setError(null)
            setMessage(null)
            startTransition(async () => {
              const result = await updateNotificationPreferencesAction({
                notificationsInApp,
                notificationsEmailEnabled: false,
                notificationsWhatsappEnabled: false,
              })

              if (!result.success) {
                setError(result.error.message)
                return
              }

              setMessage(result.data.message)
            })
          }}
        >
          {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar notificaciones
        </Button>
      </CardContent>
    </Card>
  )
}
