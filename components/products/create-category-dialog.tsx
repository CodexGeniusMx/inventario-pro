"use client"

import { useState, useTransition } from "react"
import { Loader2, Plus } from "lucide-react"

import { createCategoryAction } from "@/app/actions/categories"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { CategoryOption } from "@/types/catalog"

type CreateCategoryDialogProps = {
  onCreated: (category: CategoryOption) => void
}

export function CreateCategoryDialog({ onCreated }: CreateCategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <>
      <Button size="sm" variant="outline" onPress={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Nueva categoría
      </Button>

      <Dialog isOpen={open} onOpenChange={(next) => !isPending && setOpen(next)}>
        <DialogHeader>
          <DialogTitle>Nueva categoría</DialogTitle>
          <DialogDescription>
            Crea una categoría para organizar tu catálogo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="category-name">
            Nombre
          </label>
          <Input
            id="category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Consolas"
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
                const result = await createCategoryAction({ name })
                if (!result.success) {
                  setError(result.error.message)
                  return
                }
                onCreated(result.data)
                setName("")
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
