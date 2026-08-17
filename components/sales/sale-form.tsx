"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2 } from "lucide-react"

import {
  createSaleAction,
  getVariantSalePricesAction,
} from "@/app/actions/sales"
import { Button, LinkButton } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/format"
import { createSaleSchema } from "@/lib/validations/sale.schema"
import type { VariantOption, WarehouseRow } from "@/types/inventory"
import type { CustomerOption } from "@/types/customers"

type SaleFormProps = {
  customers: CustomerOption[]
  warehouses: WarehouseRow[]
  variants: VariantOption[]
  defaultWarehouseId?: string
}

type SaleLine = {
  id: string
  productVariantId: string
  quantity: string
}

function mapFieldErrors(
  fieldErrors: Record<string, string[]>
): Record<string, string> {
  const mapped: Record<string, string> = {}

  for (const [key, messages] of Object.entries(fieldErrors)) {
    mapped[key] = messages[0] ?? "Invalid value."
  }

  return mapped
}

function createEmptyLine(variants: VariantOption[]): SaleLine {
  return {
    id: crypto.randomUUID(),
    productVariantId: variants[0]?.id ?? "",
    quantity: "1",
  }
}

export function SaleForm({
  customers,
  warehouses,
  variants,
  defaultWarehouseId,
}: SaleFormProps) {
  const router = useRouter()
  const [warehouseId, setWarehouseId] = useState(
    defaultWarehouseId ?? warehouses[0]?.id ?? ""
  )
  const [customerId, setCustomerId] = useState<string>("")
  const [discountAmount, setDiscountAmount] = useState("0")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<SaleLine[]>(() => [createEmptyLine(variants)])
  const [priceMap, setPriceMap] = useState<Record<string, number>>({})
  const [isLoadingPrices, setIsLoadingPrices] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeWarehouses = useMemo(
    () => warehouses.filter((warehouse) => warehouse.isActive),
    [warehouses]
  )

  const variantIds = useMemo(
    () => Array.from(new Set(lines.map((line) => line.productVariantId).filter(Boolean))),
    [lines]
  )

  useEffect(() => {
    async function loadPrices() {
      if (variantIds.length === 0) {
        setPriceMap({})
        return
      }

      setIsLoadingPrices(true)
      const result = await getVariantSalePricesAction(variantIds)
      setIsLoadingPrices(false)

      if (result.success) {
        const next: Record<string, number> = {}
        result.data.prices.forEach((price) => {
          next[price.productVariantId] = price.unitPrice
        })
        setPriceMap(next)
      }
    }

    void loadPrices()
  }, [variantIds])

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => {
      const quantity = Number(line.quantity)
      const unitPrice = priceMap[line.productVariantId] ?? 0

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return sum
      }

      return sum + quantity * unitPrice
    }, 0)

    const discount = Number(discountAmount)
    const safeDiscount = Number.isFinite(discount) && discount >= 0 ? discount : 0

    return {
      subtotal,
      discount: safeDiscount,
      total: Math.max(subtotal - safeDiscount, 0),
    }
  }, [discountAmount, lines, priceMap])

  function updateLine(lineId: string, patch: Partial<SaleLine>) {
    setLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
    )
  }

  function addLine() {
    setLines((current) => [...current, createEmptyLine(variants)])
  }

  function removeLine(lineId: string) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.id !== lineId)
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    const idempotencyKey = crypto.randomUUID()

    const payload = {
      warehouseId,
      customerId: customerId || null,
      discountAmount,
      notes: notes || null,
      idempotencyKey,
      lines: lines.map((line) => ({
        productVariantId: line.productVariantId,
        quantity: line.quantity,
      })),
    }

    const parsed = createSaleSchema.safeParse(payload)

    if (!parsed.success) {
      setFieldErrors(mapFieldErrors(parsed.error.flatten().fieldErrors))
      setIsSubmitting(false)
      return
    }

    const result = await createSaleAction(parsed.data)
    setIsSubmitting(false)

    if (!result.success) {
      if (result.error.fieldErrors) {
        setFieldErrors(mapFieldErrors(result.error.fieldErrors))
      }

      setFormError(result.error.message)
      return
    }

    router.push(`/sales/${result.data.id}`)
    router.refresh()
  }

  if (activeWarehouses.length === 0 || variants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cannot create sale</CardTitle>
          <CardDescription>
            You need at least one active warehouse and product variant before
            recording a sale.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sale details</CardTitle>
          <CardDescription>
            Prices are loaded from the catalog on the server when you confirm the
            sale.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="warehouseId" className="mb-1 block text-sm font-medium">
              Warehouse
            </label>
            <select
              id="warehouseId"
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {activeWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="customerId" className="mb-1 block text-sm font-medium">
              Customer (optional)
            </label>
            <select
              id="customerId"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Walk-in customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="discountAmount" className="mb-1 block text-sm font-medium">
              Discount
            </label>
            <Input
              id="discountAmount"
              type="number"
              min="0"
              step="0.01"
              value={discountAmount}
              onChange={(event) => setDiscountAmount(event.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="mb-1 block text-sm font-medium">
              Notes
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional sale notes"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Sale lines</CardTitle>
            <CardDescription>
              Add products and quantities. Unit prices come from the server.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus data-icon="inline-start" />
            Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.map((line, index) => {
            const quantity = Number(line.quantity)
            const unitPrice = priceMap[line.productVariantId] ?? 0
            const lineTotal =
              Number.isFinite(quantity) && quantity > 0
                ? quantity * unitPrice
                : 0

            return (
              <div
                key={line.id}
                className="grid gap-3 rounded-xl border p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Product variant
                  </label>
                  <select
                    value={line.productVariantId}
                    onChange={(event) =>
                      updateLine(line.id, {
                        productVariantId: event.target.value,
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.productName} — {variant.variantName} ({variant.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(line.id, { quantity: event.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Unit price</label>
                  <p className="flex h-10 items-center tabular-nums">
                    {isLoadingPrices ? "…" : formatCurrency(unitPrice)}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Line total</label>
                  <p className="flex h-10 items-center font-medium tabular-nums">
                    {formatCurrency(lineTotal)}
                  </p>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeLine(line.id)}
                    isDisabled={lines.length === 1}
                    aria-label={`Remove line ${index + 1}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            )
          })}

          {fieldErrors.lines && (
            <p className="text-sm text-destructive">{fieldErrors.lines}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm text-muted-foreground">Estimated total</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCurrency(totals.total)}
            </p>
            <p className="text-xs text-muted-foreground">
              Subtotal {formatCurrency(totals.subtotal)}
              {totals.discount > 0 ? ` · Discount ${formatCurrency(totals.discount)}` : ""}
              {" · "}Final totals are calculated server-side when confirmed.
            </p>
          </div>
        </CardContent>
      </Card>

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" isDisabled={isSubmitting || isLoadingPrices}>
          {isSubmitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Confirm sale
        </Button>
        <LinkButton href="/sales" variant="outline">
          Cancel
        </LinkButton>
      </div>
    </form>
  )
}
