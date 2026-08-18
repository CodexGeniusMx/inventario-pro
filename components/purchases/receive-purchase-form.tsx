"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { receivePurchaseAction } from "@/app/actions/purchases"
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
import { receivePurchaseSchema } from "@/lib/validations/purchase.schema"
import type { PurchaseOrderDetail } from "@/types/purchasing"

type ReceivePurchaseFormProps = {
  purchaseOrder: PurchaseOrderDetail
}

type ReceiveLineState = {
  purchaseOrderItemId: string
  quantityReceived: string
  enabled: boolean
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

export function ReceivePurchaseForm({
  purchaseOrder,
}: ReceivePurchaseFormProps) {
  const router = useRouter()
  const receivableLines = useMemo(
    () => purchaseOrder.lines.filter((line) => line.quantityRemaining > 0),
    [purchaseOrder.lines]
  )

  const [lineStates, setLineStates] = useState<ReceiveLineState[]>(() =>
    receivableLines.map((line) => ({
      purchaseOrderItemId: line.id,
      quantityReceived: String(line.quantityRemaining),
      enabled: true,
    }))
  )
  const [notes, setNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const lineDetails = useMemo(() => {
    return receivableLines.map((line) => {
      const state = lineStates.find(
        (item) => item.purchaseOrderItemId === line.id
      )

      return {
        ...line,
        state,
      }
    })
  }, [lineStates, receivableLines])

  function updateLineState(
    purchaseOrderItemId: string,
    patch: Partial<ReceiveLineState>
  ) {
    setLineStates((current) =>
      current.map((line) =>
        line.purchaseOrderItemId === purchaseOrderItemId
          ? { ...line, ...patch }
          : line
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
      purchaseOrderId: purchaseOrder.id,
      notes,
      idempotencyKey,
      lines: lineStates
        .filter((line) => line.enabled)
        .map((line) => ({
          purchaseOrderItemId: line.purchaseOrderItemId,
          quantityReceived: line.quantityReceived,
        })),
    }

    const parsed = receivePurchaseSchema.safeParse(payload)

    if (!parsed.success) {
      setFieldErrors(mapFieldErrors(parsed.error.flatten().fieldErrors))
      setIsSubmitting(false)
      return
    }

    const result = await receivePurchaseAction(parsed.data)
    setIsSubmitting(false)

    if (!result.success) {
      if (result.error.fieldErrors) {
        setFieldErrors(mapFieldErrors(result.error.fieldErrors))
      }

      setFormError(result.error.message)
      return
    }

    router.push(`/purchases/${purchaseOrder.id}`)
    router.refresh()
  }

  if (receivableLines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No queda nada por recibir</CardTitle>
          <CardDescription>
            Todas las líneas de esta orden de compra ya fueron recibidas por completo.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Recibir mercancía</CardTitle>
          <CardDescription>
            La recepción actualiza saldos de inventario y crea registros de
            movimiento inmutables vinculados a esta recepción de compra.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineDetails.map((line) => (
            <div
              key={line.id}
              className="grid gap-3 rounded-xl border p-4 md:grid-cols-[auto_1fr_1fr_1fr]"
            >
              <div className="flex items-start pt-7">
                <input
                  type="checkbox"
                  checked={line.state?.enabled ?? false}
                  onChange={(event) =>
                    updateLineState(line.id, { enabled: event.target.checked })
                  }
                  className="size-4 rounded border-input"
                  aria-label={`Recibir ${line.productName}`}
                />
              </div>

              <div>
                <p className="font-medium">{line.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {line.variantName} · {line.sku}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Ordenado {line.quantityOrdered} · Recibido {line.quantityReceived} ·
                  Restante {line.quantityRemaining}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Cantidad a recibir
                </label>
                <Input
                  type="number"
                  min="1"
                  max={line.quantityRemaining}
                  step="1"
                  value={line.state?.quantityReceived ?? ""}
                  disabled={!line.state?.enabled}
                  onChange={(event) =>
                    updateLineState(line.id, {
                      quantityReceived: event.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Costo unitario
                </label>
                <p className="flex h-10 items-center tabular-nums">
                  ${line.unitCost.toFixed(2)}
                </p>
              </div>
            </div>
          ))}

          {fieldErrors.lines && (
            <p className="text-sm text-destructive">{fieldErrors.lines}</p>
          )}

          <div>
            <label htmlFor="receive-notes" className="mb-1 block text-sm font-medium">
              Notas de recepción
            </label>
            <Textarea
              id="receive-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
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
          Confirmar recepción
        </Button>
        <LinkButton href={`/purchases/${purchaseOrder.id}`} variant="outline">
          Cancelar
        </LinkButton>
      </div>
    </form>
  )
}
