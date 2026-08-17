"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import {
  createStockAdjustmentAction,
  getVariantBalanceAction,
} from "@/app/actions/inventory"
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
import { adjustmentTypeLabels } from "@/lib/inventory/labels"
import { createStockAdjustmentSchema } from "@/lib/validations/inventory.schema"
import type {
  StockAdjustmentType,
  VariantOption,
  WarehouseRow,
} from "@/types/inventory"

type AdjustmentFormProps = {
  warehouses: WarehouseRow[]
  variants: VariantOption[]
  defaultWarehouseId?: string
  initialAdjustmentType?: StockAdjustmentType
}

type FormState = {
  warehouseId: string
  adjustmentType: StockAdjustmentType
  reason: string
  notes: string
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

export function AdjustmentForm({
  warehouses,
  variants,
  defaultWarehouseId,
  initialAdjustmentType = "initial_stock",
}: AdjustmentFormProps) {
  const router = useRouter()
  const [formState, setFormState] = useState<FormState>({
    warehouseId: defaultWarehouseId ?? warehouses[0]?.id ?? "",
    adjustmentType: initialAdjustmentType,
    reason: "",
    notes: "",
    productVariantId: variants[0]?.id ?? "",
    quantity: "1",
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentBalance, setCurrentBalance] = useState<number | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  const activeWarehouses = useMemo(
    () => warehouses.filter((warehouse) => warehouse.isActive),
    [warehouses]
  )

  const selectedVariant = variants.find(
    (variant) => variant.id === formState.productVariantId
  )

  const projectedBalance = useMemo(() => {
    if (currentBalance === null) {
      return null
    }

    const quantity = Number(formState.quantity)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return null
    }

    if (["decrease", "damage", "loss"].includes(formState.adjustmentType)) {
      return currentBalance - quantity
    }

    return currentBalance + quantity
  }, [currentBalance, formState.adjustmentType, formState.quantity])

  useEffect(() => {
    async function loadBalance() {
      if (!formState.warehouseId || !formState.productVariantId) {
        setCurrentBalance(null)
        return
      }

      setIsLoadingBalance(true)
      const result = await getVariantBalanceAction(
        formState.warehouseId,
        formState.productVariantId
      )
      setIsLoadingBalance(false)

      if (result.success) {
        setCurrentBalance(result.data.quantityOnHand)
      } else {
        setCurrentBalance(null)
      }
    }

    void loadBalance()
  }, [formState.warehouseId, formState.productVariantId])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    const payload = {
      warehouseId: formState.warehouseId,
      adjustmentType: formState.adjustmentType,
      reason: formState.reason,
      notes: formState.notes,
      lines: [
        {
          productVariantId: formState.productVariantId,
          quantity: formState.quantity,
        },
      ],
      idempotencyKey: crypto.randomUUID(),
    }

    const parsed = createStockAdjustmentSchema.safeParse(payload)

    if (!parsed.success) {
      const nextFieldErrors: Record<string, string[]> = {}

      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form"
        nextFieldErrors[key] = [...(nextFieldErrors[key] ?? []), issue.message]
      }

      setFieldErrors(mapFieldErrors(nextFieldErrors))
      setIsSubmitting(false)
      return
    }

    const result = await createStockAdjustmentAction(parsed.data)

    if (!result.success) {
      if (result.error.fieldErrors) {
        setFieldErrors(mapFieldErrors(result.error.fieldErrors))
      }

      setFormError(result.error.message)
      setIsSubmitting(false)
      return
    }

    router.push(`/inventory/adjustments/${result.data.id}`)
    router.refresh()
  }

  function fieldError(path: string): string | undefined {
    return fieldErrors[path]
  }

  if (activeWarehouses.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No active warehouse</CardTitle>
          <CardDescription>
            Create and activate a warehouse before recording stock adjustments.
          </CardDescription>
          <LinkButton href="/inventory/warehouses/new" className="mt-4">
            Create warehouse
          </LinkButton>
        </CardHeader>
      </Card>
    )
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {formError && (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {formError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Adjustment details</CardTitle>
          <CardDescription>
            Stock changes are recorded as immutable inventory movements.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="warehouseId" className="text-sm font-medium">
              Warehouse
            </label>
            <select
              id="warehouseId"
              value={formState.warehouseId}
              onChange={(event) => updateField("warehouseId", event.target.value)}
              className="flex h-8 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              disabled={isSubmitting}
            >
              {activeWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                  {warehouse.isDefault ? " (Default)" : ""}
                </option>
              ))}
            </select>
            {fieldError("warehouseId") && (
              <p className="text-sm text-destructive">{fieldError("warehouseId")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="adjustmentType" className="text-sm font-medium">
              Adjustment type
            </label>
            <select
              id="adjustmentType"
              value={formState.adjustmentType}
              onChange={(event) =>
                updateField(
                  "adjustmentType",
                  event.target.value as StockAdjustmentType
                )
              }
              className="flex h-8 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              disabled={isSubmitting}
            >
              {Object.entries(adjustmentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Reason
            </label>
            <Input
              id="reason"
              value={formState.reason}
              onChange={(event) => updateField("reason", event.target.value)}
              placeholder="Why is this stock change being recorded?"
              aria-invalid={Boolean(fieldError("reason"))}
              disabled={isSubmitting}
            />
            {fieldError("reason") && (
              <p className="text-sm text-destructive">{fieldError("reason")}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <Textarea
              id="notes"
              rows={3}
              value={formState.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product line</CardTitle>
          <CardDescription>
            Select a variant and quantity. Negative adjustments cannot reduce stock below zero.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="productVariantId" className="text-sm font-medium">
              Product / variant
            </label>
            <select
              id="productVariantId"
              value={formState.productVariantId}
              onChange={(event) =>
                updateField("productVariantId", event.target.value)
              }
              className="flex h-8 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              disabled={isSubmitting || variants.length === 0}
            >
              {variants.length === 0 ? (
                <option value="">No active variants available</option>
              ) : (
                variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.productName} — {variant.variantName} ({variant.sku})
                  </option>
                ))
              )}
            </select>
            {fieldError("lines.0.productVariantId") && (
              <p className="text-sm text-destructive">
                {fieldError("lines.0.productVariantId")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="quantity" className="text-sm font-medium">
              Quantity
            </label>
            <Input
              id="quantity"
              type="number"
              min="1"
              step="1"
              value={formState.quantity}
              onChange={(event) => updateField("quantity", event.target.value)}
              aria-invalid={Boolean(fieldError("lines.0.quantity"))}
              disabled={isSubmitting}
            />
            {fieldError("lines.0.quantity") && (
              <p className="text-sm text-destructive">
                {fieldError("lines.0.quantity")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Stock impact</p>
            <div className="rounded-2xl border bg-muted/30 px-3 py-2 text-sm">
              {isLoadingBalance ? (
                <span className="text-muted-foreground">Loading current stock…</span>
              ) : (
                <>
                  <p>
                    Current on hand:{" "}
                    <span className="font-medium tabular-nums">
                      {currentBalance ?? 0}
                    </span>
                  </p>
                  {projectedBalance !== null && (
                    <p>
                      After adjustment:{" "}
                      <span
                        className={
                          projectedBalance < 0
                            ? "font-medium text-destructive tabular-nums"
                            : "font-medium tabular-nums"
                        }
                      >
                        {projectedBalance}
                      </span>
                    </p>
                  )}
                  {selectedVariant && (
                    <p className="mt-1 text-muted-foreground">
                      {selectedVariant.productName} · {selectedVariant.sku}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" isDisabled={isSubmitting || variants.length === 0}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              Saving…
            </>
          ) : (
            "Create adjustment"
          )}
        </Button>
        <LinkButton href="/inventory/adjustments" variant="outline">
          Cancel
        </LinkButton>
      </div>
    </form>
  )
}
