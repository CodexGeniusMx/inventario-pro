import { PackageOpen } from "lucide-react"

import { LinkButton } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type InventoryEmptyStateProps = {
  hasFilters: boolean
  canAdjust: boolean
  hasWarehouse: boolean
}

export function InventoryEmptyState({
  hasFilters,
  canAdjust,
  hasWarehouse,
}: InventoryEmptyStateProps) {
  if (!hasWarehouse) {
    return (
      <Card className="border-dashed">
        <CardHeader className="items-center text-center">
          <CardTitle>No hay almacén configurado</CardTitle>
          <CardDescription>
            Crea un almacén antes de registrar inventario o movimientos de stock.
          </CardDescription>
          <LinkButton href="/inventory/warehouses/new" className="mt-4">
            Crear almacén
          </LinkButton>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-muted">
          <PackageOpen className="size-6 text-muted-foreground" />
        </div>
        <CardTitle>
          {hasFilters ? "Ningún inventario coincide con tus filtros" : "Sin inventario registrado"}
        </CardTitle>
        <CardDescription>
          {hasFilters
            ? "Intenta ajustar tu búsqueda o filtros."
            : "Registra stock inicial para comenzar a rastrear cantidades."}
        </CardDescription>
        {canAdjust && !hasFilters && (
          <LinkButton href="/inventory/adjustments/new" className="mt-4">
            Registrar stock inicial
          </LinkButton>
        )}
      </CardHeader>
    </Card>
  )
}
