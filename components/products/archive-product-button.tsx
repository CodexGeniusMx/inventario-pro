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
        Archive product
      </Button>

      {open && (
        <Dialog isOpen={open} onOpenChange={setOpen}>
          <DialogHeader>
            <DialogTitle>Archive {productName}?</DialogTitle>
            <DialogDescription>
              This product will be marked as archived and hidden from the default
              product list. Inventory history is preserved.
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
              Cancel
            </Button>
            <Button
              variant="destructive"
              onPress={handleArchive}
              isDisabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Archiving…
                </>
              ) : (
                "Archive product"
              )}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </>
  )
}
