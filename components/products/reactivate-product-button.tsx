"use client"

import { useState, useTransition } from "react"
import { Loader2, RotateCcw } from "lucide-react"

import { reactivateProductAction } from "@/app/actions/products"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ReactivateProductButtonProps = {
  productId: string
  productName: string
}

export function ReactivateProductButton({
  productId,
  productName,
}: ReactivateProductButtonProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <>
      <Button variant="outline" onPress={() => setOpen(true)}>
        <RotateCcw data-icon="inline-start" />
        Reactivar producto
      </Button>

      <Dialog isOpen={open} onOpenChange={(next) => !isPending && setOpen(next)}>
        <DialogHeader>
          <DialogTitle>Reactivar producto</DialogTitle>
          <DialogDescription>
            ¿Reactivar <span className="font-medium text-foreground">{productName}</span>?
            El historial de ventas e inventario se conservará.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" isDisabled={isPending} onPress={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            isDisabled={isPending}
            onPress={() => {
              setError(null)
              startTransition(async () => {
                const result = await reactivateProductAction(productId)
                if (!result.success) {
                  setError(result.error.message)
                  return
                }
                setOpen(false)
                window.location.reload()
              })
            }}
          >
            {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Reactivar producto
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
