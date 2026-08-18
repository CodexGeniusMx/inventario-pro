import { describe, expect, it } from "vitest"

import {
  normalizeAllowedCurrencies,
  resolveTransactionCurrency,
  shouldShowCurrencySelector,
  validateCurrencyConfiguration,
} from "@/lib/currency/types"

describe("currency configuration", () => {
  it("requires at least one allowed currency", () => {
    expect(validateCurrencyConfiguration("MXN", [])).toMatch(/al menos una/i)
  })

  it("requires base currency in allowed list", () => {
    expect(validateCurrencyConfiguration("MXN", ["USD"])).toMatch(/moneda base/i)
  })

  it("accepts MXN-only configuration", () => {
    expect(validateCurrencyConfiguration("MXN", ["MXN"])).toBeNull()
    expect(shouldShowCurrencySelector(["MXN"])).toBe(false)
    expect(resolveTransactionCurrency(["MXN"], "USD")).toBe("MXN")
  })

  it("accepts USD-only configuration", () => {
    expect(validateCurrencyConfiguration("USD", ["USD"])).toBeNull()
    expect(shouldShowCurrencySelector(["USD"])).toBe(false)
  })

  it("supports MXN + USD without auto conversion", () => {
    expect(validateCurrencyConfiguration("MXN", ["MXN", "USD"])).toBeNull()
    expect(shouldShowCurrencySelector(["MXN", "USD"])).toBe(true)
    expect(resolveTransactionCurrency(["MXN", "USD"], "USD")).toBe("USD")
  })

  it("keeps currency totals in separate buckets", () => {
    const rows = [
      { total: 100000, currencyCode: "MXN" },
      { total: 5000, currencyCode: "USD" },
    ]
    const grouped = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.currencyCode] = (acc[row.currencyCode] ?? 0) + row.total
      return acc
    }, {})
    expect(Object.keys(grouped)).toEqual(["MXN", "USD"])
    expect(grouped.MXN).toBe(100000)
    expect(grouped.USD).toBe(5000)
  })

  it("normalizes allowed currencies with fallback", () => {
    expect(normalizeAllowedCurrencies(["MXN", "MXN", "INVALID"])).toEqual(["MXN"])
  })
})
