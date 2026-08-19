"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { createPurchaseAction } from "@/app/actions/purchases"
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
import {
  shouldShowCurrencySelector,
  type SupportedCurrency,
} from "@/lib/currency/types"
import { createPurchaseSchema } from "@/lib/validations/purchase.schema"
import type { VariantOption, WarehouseRow } from "@/types/inventory"
import type { SupplierOption } from "@/types/suppliers"

type PurchaseOrderFormProps = {
  suppliers: SupplierOption[]
  warehouses: WarehouseRow[]
  variants: VariantOption[]
  defaultWarehouseId?: string
  allowedCurrencies: SupportedCurrency[]
  defaultCurrency: SupportedCurrency
}

type PurchaseLine = {
  id: string
  productVariantId: string
  quantityOrdered: string
  unitCost: string
}

function mapFieldErrors(
  fieldErrors: Record<string, string[]>
): Record<string, string> {
  const mapped: Record<string, string> = {}

  for (const [key, messages] of Object.entries(fieldErrors)) {
    mapped[key] = messages[0] ?? "Valor no válido."
  }

  return mapped
}

function createEmptyLine(variants: VariantOption[]): PurchaseLine {
  return {
    id: crypto.randomUUID(),
    productVariantId: variants[0]?.id ?? "",
    quantityOrdered: "1",
    unitCost: "0",
  }
}

export function PurchaseOrderForm({
  suppliers,
  warehouses,
  variants,
  defaultWarehouseId,
  allowedCurrencies,
  defaultCurrency,
}: PurchaseOrderFormProps) {
  const router = useRouter()
  const idempotencyKeyRef = useRef(crypto.randomUUID())
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "")
  const [warehouseId, setWarehouseId] = useState(
    defaultWarehouseId ?? warehouses[0]?.id ?? ""
  )
  const [currencyCode, setCurrencyCode] = useState(defaultCurrency)
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<PurchaseLine[]>(() => [
    createEmptyLine(variants),
  ])
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeWarehouses = useMemo(
    () => warehouses.filter((warehouse) => warehouse.isActive),
    [warehouses]
  )

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        const quantity = Number(line.quantityOrdered)
        const unitCost = Number(line.unitCost)

        if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) {
          return acc
        }

        const lineTotal = quantity * unitCost
        return {
          subtotal: acc.subtotal + lineTotal,
          total: acc.total + lineTotal,
        }
      },
      { subtotal: 0, total: 0 }
    )
  }, [lines])

  function updateLine(lineId: string, patch: Partial<PurchaseLine>) {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, ...patch } : line
      )
    )
  }

  function addLine() {
    setLines((current) => [...current, createEmptyLine(variants)])
  }

  function removeLine(lineId: string) {
    setLines((current) =>
      current.length === 1
        ? current
        : current.filter((line) => line.id !== lineId)
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    const idempotencyKey = idempotencyKeyRef.current

    const payload = {
      supplierId,
      warehouseId,
      notes,
      idempotencyKey,
      ...(shouldShowCurrencySelector(allowedCurrencies)
        ? { currencyCode }
        : {}),
      lines: lines.map((line) => ({
        productVariantId: line.productVariantId,
        quantityOrdered: line.quantityOrdered,
        unitCost: line.unitCost,
      })),
    }

    const parsed = createPurchaseSchema.safeParse(payload)

    if (!parsed.success) {
      setFieldErrors(mapFieldErrors(parsed.error.flatten().fieldErrors))
      setIsSubmitting(false)
      return
    }

    const result = await createPurchaseAction(parsed.data)
    setIsSubmitting(false)

    if (!result.success) {
      if (result.error.fieldErrors) {
        setFieldErrors(mapFieldErrors(result.error.fieldErrors))
      }

      setFormError(result.error.message)
      return
    }

    router.push(`/purchases/${result.data.id}`)
    router.refresh()
    idempotencyKeyRef.current = crypto.randomUUID()
  }

  if (suppliers.length === 0 || activeWarehouses.length === 0 || variants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No se puede crear la orden de compra</CardTitle>
          <CardDescription>
            Necesitas al menos un proveedor, almacén y variante de producto activos
            antes de crear una compra.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Detalles de la compra</CardTitle>
          <CardDescription>
            Crear una orden de compra no cambia el inventario hasta recibir la
            mercancía.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="supplierId" className="mb-1 block text-sm font-medium">
              Proveedor
            </label>
            <select
              id="supplierId"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {fieldErrors.supplierId && (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.supplierId}</p>
            )}
          </div>

          <div>
            <label htmlFor="warehouseId" className="mb-1 block text-sm font-medium">
              Almacén
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
            {fieldErrors.warehouseId && (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.warehouseId}</p>
            )}
          </div>

          {shouldShowCurrencySelector(allowedCurrencies) && (
            <div>
              <label htmlFor="currencyCode" className="mb-1 block text-sm font-medium">
                Moneda
              </label>
              <select
                id="currencyCode"
                value={currencyCode}
                onChange={(event) =>
                  setCurrencyCode(event.target.value as SupportedCurrency)
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {allowedCurrencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="mb-1 block text-sm font-medium">
              Notas
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Líneas de orden</CardTitle>
            <CardDescription>
              Agrega variantes de producto, cantidades y costos unitarios.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus data-icon="inline-start" />
            Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.map((line, index) => {
            const quantity = Number(line.quantityOrdered)
            const unitCost = Number(line.unitCost)
            const lineTotal =
              Number.isFinite(quantity) && Number.isFinite(unitCost)
                ? quantity * unitCost
                : 0

            return (
              <div
                key={line.id}
                className="grid gap-3 rounded-xl border p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Variante de producto
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
                  <label className="mb-1 block text-sm font-medium">
                    Cantidad
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantityOrdered}
                    onChange={(event) =>
                      updateLine(line.id, {
                        quantityOrdered: event.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Costo unitario
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitCost}
                    onChange={(event) =>
                      updateLine(line.id, { unitCost: event.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Total de línea
                  </label>
                  <p className="flex h-10 items-center font-medium tabular-nums">
                    {formatCurrency(lineTotal, currencyCode)}
                  </p>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeLine(line.id)}
                    isDisabled={lines.length === 1}
                    aria-label={`Eliminar línea ${index + 1}`}
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
            <p className="text-sm text-muted-foreground">Total estimado</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCurrency(totals.total, currencyCode)}
            </p>
            <p className="text-xs text-muted-foreground">
              Los totales finales se calculan en el servidor al guardar.
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
        <Button type="submit" isDisabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar orden de compra
        </Button>
        <LinkButton href="/purchases" variant="outline">
          Cancelar
        </LinkButton>
      </div>
    </form>
  )
}
