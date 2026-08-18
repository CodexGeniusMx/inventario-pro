export const SUPPORTED_CURRENCIES = ["MXN", "USD"] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

export type OrganizationCurrencySettings = {
  baseCurrency: SupportedCurrency
  allowedCurrencies: SupportedCurrency[]
}

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(value as SupportedCurrency)
}

export function normalizeAllowedCurrencies(
  values: string[]
): SupportedCurrency[] {
  const unique = [...new Set(values.filter(isSupportedCurrency))]
  return unique.length > 0 ? unique : ["MXN"]
}

export function validateCurrencyConfiguration(
  baseCurrency: SupportedCurrency,
  allowedCurrencies: SupportedCurrency[]
): string | null {
  if (allowedCurrencies.length < 1) {
    return "Debe existir al menos una moneda permitida."
  }

  if (!allowedCurrencies.includes(baseCurrency)) {
    return "La moneda base debe estar incluida en las monedas permitidas."
  }

  return null
}

export function shouldShowCurrencySelector(
  allowedCurrencies: SupportedCurrency[]
): boolean {
  return allowedCurrencies.length > 1
}

export function resolveTransactionCurrency(
  allowedCurrencies: SupportedCurrency[],
  selected?: SupportedCurrency | null
): SupportedCurrency {
  if (allowedCurrencies.length === 1) {
    return allowedCurrencies[0]
  }

  if (selected && allowedCurrencies.includes(selected)) {
    return selected
  }

  return allowedCurrencies[0]
}

export function currencyLabel(code: SupportedCurrency): string {
  if (code === "MXN") return "MXN — Peso mexicano"
  return "USD — Dólar estadounidense"
}
