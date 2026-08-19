"use client"

import { useState, useTransition } from "react"
import { Loader2, Plus } from "lucide-react"

import { createUnitAction } from "@/app/actions/units"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { UnitOption } from "@/services/catalog/unit.service"

type CreateUnitDialogProps = {
  onCreated: (unit: UnitOption) => void
}

export function CreateUnitDialog({ onCreated }: CreateUnitDialogProps) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <>
      <Button size="sm" variant="outline" onPress={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nueva unidad
      </Button>

      <Dialog isOpen={open} onOpenChange={(next) => !isPending && setOpen(next)}>
        <DialogHeader>
          <DialogTitle>Nueva unidad</DialogTitle>
          <DialogDescription>
            Agrega una unidad personalizada al catálogo de la organización.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="unit-label">
            Nombre
          </label>
          <Input
            id="unit-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Bulto"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" isDisabled={isPending} onPress={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            isDisabled={isPending}
            onPress={() => {
              setError(null)
              startTransition(async () => {
                const result = await createUnitAction({ label })
                if (!result.success) {
                  setError(result.error.message)
                  return
                }
                onCreated({
                  id: result.data.id,
                  code: result.data.code,
                  label: result.data.label,
                  isSystem: false,
                })
                setLabel("")
                setOpen(false)
              })
            }}
          >
            {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Crear
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
