"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { updateCurrencySettingsAction } from "@/app/actions/settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  SUPPORTED_CURRENCIES,
  currencyLabel,
  type SupportedCurrency,
} from "@/lib/currency/types"

type CurrencySettingsFormProps = {
  baseCurrency: SupportedCurrency
  allowedCurrencies: SupportedCurrency[]
}

export function CurrencySettingsForm({
  baseCurrency,
  allowedCurrencies,
}: CurrencySettingsFormProps) {
  const [base, setBase] = useState(baseCurrency)
  const [allowed, setAllowed] = useState<SupportedCurrency[]>(allowedCurrencies)
  const [confirmNoConversion, setConfirmNoConversion] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleCurrency(currency: SupportedCurrency) {
    setAllowed((current) => {
      if (current.includes(currency)) {
        const next = current.filter((item) => item !== currency)
        return next.length > 0 ? next : current
      }

      return [...current, currency]
    })
  }

  return (
    <Card id="monedas">
      <CardHeader>
        <CardTitle>Monedas</CardTitle>
        <CardDescription>
          Los precios del catálogo usan la moneda base. No hay conversión automática entre monedas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="base-currency">
            Moneda base
          </label>
          <select
            id="base-currency"
            className="flex h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
            value={base}
            onChange={(event) => setBase(event.target.value as SupportedCurrency)}
          >
            {allowed.map((currency) => (
              <option key={currency} value={currency}>
                {currencyLabel(currency)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Monedas permitidas</p>
          <div className="space-y-2">
            {SUPPORTED_CURRENCIES.map((currency) => (
              <label key={currency} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowed.includes(currency)}
                  onChange={() => toggleCurrency(currency)}
                />
                {currencyLabel(currency)}
              </label>
            ))}
          </div>
        </div>

        {base !== baseCurrency && (
          <label className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <input
              type="checkbox"
              checked={confirmNoConversion}
              onChange={(event) => setConfirmNoConversion(event.target.checked)}
            />
            <span>
              Entiendo que los precios existentes del catálogo no se convertirán automáticamente al cambiar la moneda base.
            </span>
          </label>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <Button
          isDisabled={isPending}
          onPress={() => {
            setError(null)
            setMessage(null)
            startTransition(async () => {
              const result = await updateCurrencySettingsAction({
                baseCurrency: base,
                allowedCurrencies: allowed,
                confirmNoConversion,
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
          Guardar monedas
        </Button>
      </CardContent>
    </Card>
  )
}
