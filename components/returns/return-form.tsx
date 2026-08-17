"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { processReturnAction } from "@/app/actions/returns"
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
import { processReturnSchema } from "@/lib/validations/return.schema"
import type { SaleReturnContext } from "@/types/returns"

type ReturnFormProps = {
  sale: SaleReturnContext
}

type ReturnLineState = {
  saleItemId: string
  quantity: string
  enabled: boolean
  isRestockable: boolean
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

export function ReturnForm({ sale }: ReturnFormProps) {
  const router = useRouter()
  const [lineStates, setLineStates] = useState<ReturnLineState[]>(() =>
    sale.lines.map((line) => ({
      saleItemId: line.id,
      quantity: String(line.quantityReturnable),
      enabled: true,
      isRestockable: true,
    }))
  )
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const lineDetails = useMemo(() => {
    return sale.lines.map((line) => {
      const state = lineStates.find((item) => item.saleItemId === line.id)

      return {
        ...line,
        state,
      }
    })
  }, [lineStates, sale.lines])

  function updateLineState(
    saleItemId: string,
    patch: Partial<ReturnLineState>
  ) {
    setLineStates((current) =>
      current.map((line) =>
        line.saleItemId === saleItemId ? { ...line, ...patch } : line
      )
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    const idempotencyKey = crypto.randomUUID()

    const payload = {
      saleId: sale.id,
      reason,
      notes: notes || null,
      idempotencyKey,
      lines: lineStates
        .filter((line) => line.enabled)
        .map((line) => ({
          saleItemId: line.saleItemId,
          quantity: line.quantity,
          isRestockable: line.isRestockable,
        })),
    }

    const parsed = processReturnSchema.safeParse(payload)

    if (!parsed.success) {
      setFieldErrors(mapFieldErrors(parsed.error.flatten().fieldErrors))
      setIsSubmitting(false)
      return
    }

    const result = await processReturnAction(parsed.data)
    setIsSubmitting(false)

    if (!result.success) {
      if (result.error.fieldErrors) {
        setFieldErrors(mapFieldErrors(result.error.fieldErrors))
      }

      setFormError(result.error.message)
      return
    }

    router.push(`/returns/${result.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Return details</CardTitle>
          <CardDescription>
            Return stock to {sale.warehouseName}. Quantities are validated
            server-side against the original sale.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Sale</p>
            <p className="font-medium">{sale.documentNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{sale.customerName ?? "Walk-in"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Warehouse</p>
            <p className="font-medium">{sale.warehouseName}</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="reason" className="mb-1 block text-sm font-medium">
              Reason
            </label>
            <Input
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Customer return, defective item, etc."
            />
            {fieldErrors.reason && (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.reason}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className="mb-1 block text-sm font-medium">
              Notes
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Return lines</CardTitle>
          <CardDescription>
            Select items and quantities to return. Restockable items increase
            sellable inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineDetails.map((line) => (
            <div
              key={line.id}
              className="grid gap-3 rounded-xl border p-4 md:grid-cols-[auto_2fr_1fr_1fr_1fr]"
            >
              <div className="flex items-start pt-6">
                <input
                  type="checkbox"
                  checked={line.state?.enabled ?? false}
                  onChange={(event) =>
                    updateLineState(line.id, { enabled: event.target.checked })
                  }
                  aria-label={`Include ${line.productName}`}
                />
              </div>

              <div>
                <p className="font-medium">{line.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {line.variantName} · {line.sku}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sold {line.quantitySold} · Returned {line.quantityReturned} ·
                  Remaining {line.quantityReturnable}
                </p>
                <p className="text-sm tabular-nums">
                  Unit price {formatCurrency(line.unitPrice)}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Return qty
                </label>
                <Input
                  type="number"
                  min="1"
                  max={line.quantityReturnable}
                  step="1"
                  value={line.state?.quantity ?? "1"}
                  onChange={(event) =>
                    updateLineState(line.id, { quantity: event.target.value })
                  }
                  disabled={!line.state?.enabled}
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={line.state?.isRestockable ?? true}
                    onChange={(event) =>
                      updateLineState(line.id, {
                        isRestockable: event.target.checked,
                      })
                    }
                    disabled={!line.state?.enabled}
                  />
                  Restockable
                </label>
              </div>
            </div>
          ))}

          {fieldErrors.lines && (
            <p className="text-sm text-destructive">{fieldErrors.lines}</p>
          )}
        </CardContent>
      </Card>

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" isDisabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              Processing return…
            </>
          ) : (
            "Process return"
          )}
        </Button>
        <LinkButton href={`/sales/${sale.id}`} variant="outline">
          Cancel
        </LinkButton>
      </div>
    </form>
  )
}
