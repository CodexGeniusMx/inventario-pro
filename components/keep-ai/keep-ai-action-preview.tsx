"use client"

import { Button } from "@/components/ui/button"
import type { KeepAiPreparedAction } from "@/lib/keep-ai/types"

type KeepAiActionPreviewProps = {
  action: KeepAiPreparedAction
  onCancel: () => void
  onConfirm: () => void
  isConfirming?: boolean
}

export function KeepAiActionPreview({
  action,
  onCancel,
  onConfirm,
  isConfirming = false,
}: KeepAiActionPreviewProps) {
  const fields = Object.entries(action.payload).filter(
    ([key]) => key !== "draftText"
  )

  return (
    <div className="rounded-xl border bg-muted/30 p-3 text-sm">
      <p className="font-medium">{action.title}</p>
      {action.summary && (
        <p className="mt-1 text-muted-foreground">{action.summary}</p>
      )}

      {fields.length > 0 && (
        <dl className="mt-3 space-y-2">
          {fields.map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {key}
              </dt>
              <dd className="font-medium">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          onPress={onConfirm}
          isDisabled={isConfirming}
        >
          Confirmar
        </Button>
        <Button size="sm" variant="outline" onPress={onCancel}>
          Cancelar
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Las acciones sensibles requieren confirmación explícita antes de ejecutarse.
      </p>
    </div>
  )
}
