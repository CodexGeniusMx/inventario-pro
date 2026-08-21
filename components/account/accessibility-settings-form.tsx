"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { updateAccessibilityPreferencesAction } from "@/app/actions/account"
import { useUserPreferences } from "@/components/preferences/preferences-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { DensityPreference, TextSizePreference } from "@/lib/preferences/types"

export function AccessibilitySettingsForm() {
  const { preferences, replacePreferences } = useUserPreferences()
  const [textSize, setTextSize] = useState<TextSizePreference>(preferences.textSize)
  const [density, setDensity] = useState<DensityPreference>(preferences.density)
  const [reduceMotion, setReduceMotion] = useState(preferences.reduceMotion)
  const [highContrast, setHighContrast] = useState(preferences.highContrast)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accesibilidad</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Tamaño de texto</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { value: "normal" as const, label: "Normal" },
              { value: "large" as const, label: "Grande" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="radio"
                  name="text-size"
                  checked={textSize === option.value}
                  onChange={() => setTextSize(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Densidad de interfaz</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { value: "compact" as const, label: "Compacta" },
              { value: "normal" as const, label: "Normal" },
              { value: "comfortable" as const, label: "Cómoda" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="radio"
                  name="accessibility-density"
                  checked={density === option.value}
                  onChange={() => setDensity(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-4">
          <Switch
            isSelected={reduceMotion}
            onChange={setReduceMotion}
            label="Reducir animaciones"
            description="Minimiza transiciones y efectos visuales."
          />

          <Switch
            isSelected={highContrast}
            onChange={setHighContrast}
            label="Alto contraste"
            description="Refuerza bordes y contraste sin alterar permisos ni datos."
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
              const result = await updateAccessibilityPreferencesAction({
                textSize,
                density,
                reduceMotion,
                highContrast,
              })

              if (!result.success) {
                setError(result.error.message)
                return
              }

              replacePreferences(result.data.preferences)
              setMessage(result.data.message)
            })
          }}
        >
          {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar accesibilidad
        </Button>
      </CardContent>
    </Card>
  )
}
