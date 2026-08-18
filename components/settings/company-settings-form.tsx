"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { updateCompanySettingsAction } from "@/app/actions/settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { OrganizationSettings } from "@/types/settings"

type CompanySettingsFormProps = {
  settings: OrganizationSettings
}

export function CompanySettingsForm({ settings }: CompanySettingsFormProps) {
  const [name, setName] = useState(settings.name)
  const [timezone, setTimezone] = useState(settings.timezone)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <Card id="empresa">
      <CardHeader>
        <CardTitle>Empresa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="org-name">
            Nombre para mostrar
          </label>
          <Input
            id="org-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="org-timezone">
            Zona horaria
          </label>
          <Input
            id="org-timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            placeholder="America/Mexico_City"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Button
          isDisabled={isPending}
          onPress={() => {
            setError(null)
            setMessage(null)
            startTransition(async () => {
              const result = await updateCompanySettingsAction({ name, timezone })
              if (!result.success) {
                setError(result.error.message)
                return
              }
              setMessage(result.data.message)
            })
          }}
        >
          {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar empresa
        </Button>
      </CardContent>
    </Card>
  )
}
