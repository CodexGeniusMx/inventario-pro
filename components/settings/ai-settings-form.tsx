"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { updateAiSettingsAction } from "@/app/actions/settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OrganizationSettings } from "@/types/settings"

type AiSettingsFormProps = {
  settings: OrganizationSettings["ai"]
}

export function AiSettingsForm({ settings }: AiSettingsFormProps) {
  const [enabled, setEnabled] = useState(settings.enabled)
  const [allowQueries, setAllowQueries] = useState(settings.allowQueries)
  const [allowPrepare, setAllowPrepare] = useState(settings.allowPrepare)
  const [requireConfirmation, setRequireConfirmation] = useState(
    settings.requireConfirmation
  )
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <Card id="keep-ai">
      <CardHeader>
        <CardTitle>Asistente IA — Keep AI</CardTitle>
        <CardDescription>
          Keep AI hereda los permisos del usuario y nunca expone secretos de infraestructura.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          ["Activado", enabled, setEnabled],
          ["Consultas", allowQueries, setAllowQueries],
          ["Preparar acciones", allowPrepare, setAllowPrepare],
          [
            "Requerir confirmación antes de cambios",
            requireConfirmation,
            setRequireConfirmation,
          ],
        ].map(([label, checked, setter]) => (
          <label key={label as string} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked as boolean}
              onChange={(event) =>
                (setter as (value: boolean) => void)(event.target.checked)
              }
            />
            {label as string}
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
              const result = await updateAiSettingsAction({
                enabled,
                allowQueries,
                allowPrepare,
                requireConfirmation,
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
          Guardar Keep AI
        </Button>
      </CardContent>
    </Card>
  )
}
