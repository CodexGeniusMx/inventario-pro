import type { SupportedCurrency } from "@/lib/currency/types"

const currencyFormatters = new Map<string, Intl.NumberFormat>()
const compactCurrencyFormatters = new Map<string, Intl.NumberFormat>()
const numberFormatter = new Intl.NumberFormat("es-MX")

function getCurrencyFormatter(currency: SupportedCurrency): Intl.NumberFormat {
  const existing = currencyFormatters.get(currency)
  if (existing) return existing

  const formatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  currencyFormatters.set(currency, formatter)
  return formatter
}

function getCompactCurrencyFormatter(
  currency: SupportedCurrency
): Intl.NumberFormat {
  const existing = compactCurrencyFormatters.get(currency)
  if (existing) return existing

  const formatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  })
  compactCurrencyFormatters.set(currency, formatter)
  return formatter
}

export function formatCurrency(
  value: number,
  currency: SupportedCurrency = "MXN"
): string {
  return getCurrencyFormatter(currency).format(value)
}

export function formatCompactCurrency(
  value: number,
  currency: SupportedCurrency = "MXN"
): string {
  return getCompactCurrencyFormatter(currency).format(value)
}

export function formatCurrencyWithCode(
  value: number,
  currency: SupportedCurrency
): string {
  return `${formatCurrency(value, currency)} ${currency}`
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return "Justo ahora"
  if (diffMinutes < 60) return `hace ${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `hace ${diffHours} h`

  return date.toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value

  return date.toLocaleString("es-MX", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export type CurrencyTotals = Partial<Record<SupportedCurrency, number>>

export function formatCurrencyTotals(totals: CurrencyTotals): string[] {
  return (["MXN", "USD"] as SupportedCurrency[])
    .filter((currency) => (totals[currency] ?? 0) !== 0)
    .map((currency) => formatCurrencyWithCode(totals[currency] ?? 0, currency))
}
