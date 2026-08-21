"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { updateAppearancePreferencesAction } from "@/app/actions/account"
import { useUserPreferences } from "@/components/preferences/preferences-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DensityPreference, ThemePreference } from "@/lib/preferences/types"

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
]

const densityOptions: Array<{ value: DensityPreference; label: string; hint: string }> =
  [
    { value: "compact", label: "Compacta", hint: "Menos espacio en tablas y formularios." },
    { value: "normal", label: "Normal", hint: "Densidad equilibrada." },
    {
      value: "comfortable",
      label: "Cómoda",
      hint: "Más espacio para lectura prolongada.",
    },
  ]

export function AppearanceSettingsForm() {
  const { preferences, replacePreferences } = useUserPreferences()
  const [theme, setTheme] = useState(preferences.theme)
  const [density, setDensity] = useState(preferences.density)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Tema</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {themeOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Densidad de interfaz</legend>
          <div className="grid gap-2">
            {densityOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="radio"
                  name="density"
                  value={option.value}
                  checked={density === option.value}
                  onChange={() => setDensity(option.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-sm text-muted-foreground">
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <Button
          isDisabled={isPending}
          onPress={() => {
            setError(null)
            setMessage(null)
            startTransition(async () => {
              const result = await updateAppearancePreferencesAction({
                theme,
                density,
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
          Guardar apariencia
        </Button>
      </CardContent>
    </Card>
  )
}
