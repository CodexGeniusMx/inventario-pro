import { PackageOpen } from "lucide-react"

import { LinkButton } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ProductsEmptyStateProps = {
  canWrite: boolean
  hasFilters: boolean
}

export function ProductsEmptyState({
  canWrite,
  hasFilters,
}: ProductsEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-muted">
          <PackageOpen className="size-6 text-muted-foreground" />
        </div>
        <CardTitle>
          {hasFilters ? "Ningún producto coincide con tus filtros" : "Aún no hay productos"}
        </CardTitle>
        <CardDescription>
          {hasFilters
            ? "Intenta ajustar tu búsqueda o filtros para encontrar lo que necesitas."
            : "Crea tu primer producto para comenzar a construir tu catálogo."}
        </CardDescription>
        {canWrite && !hasFilters && (
          <LinkButton href="/products/new" className="mt-4">
            Crear producto
          </LinkButton>
        )}
      </CardHeader>
    </Card>
  )
}
