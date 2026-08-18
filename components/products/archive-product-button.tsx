"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { archiveProductAction } from "@/app/actions/products"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ArchiveProductButtonProps = {
  productId: string
  productName: string
}

export function ArchiveProductButton({
  productId,
  productName,
}: ArchiveProductButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleArchive() {
    setError(null)
    setIsSubmitting(true)

    const result = await archiveProductAction(productId)

    if (!result.success) {
      setError(result.error.message)
      setIsSubmitting(false)
      return
    }

    setOpen(false)
    router.push("/products")
    router.refresh()
  }

  return (
    <>
      <Button variant="destructive" onPress={() => setOpen(true)}>
        Archivar producto
      </Button>

      {open && (
        <Dialog isOpen={open} onOpenChange={setOpen}>
          <DialogHeader>
            <DialogTitle>¿Archivar {productName}?</DialogTitle>
            <DialogDescription>
              Este producto se marcará como archivado y se ocultará de la lista
              predeterminada. El historial de inventario se conserva.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onPress={() => setOpen(false)}
              isDisabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onPress={handleArchive}
              isDisabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Archivando…
                </>
              ) : (
                "Archivar producto"
              )}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </>
  )
}
