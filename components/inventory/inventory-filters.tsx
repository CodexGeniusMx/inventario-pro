"use client"

import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { WarehouseRow } from "@/types/inventory"

type InventoryFiltersProps = {
  warehouses: WarehouseRow[]
  initialQuery?: string
  initialWarehouseId?: string
  initialStockStatus?: string
}

export function InventoryFilters({
  warehouses,
  initialQuery = "",
  initialWarehouseId = "",
  initialStockStatus = "all",
}: InventoryFiltersProps) {
  const router = useRouter()
  const hasActiveFilters =
    Boolean(initialQuery) ||
    Boolean(initialWarehouseId) ||
    initialStockStatus !== "all"

  return (
    <form
      className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-4 lg:flex-row lg:items-end"
      method="get"
      action="/inventory"
    >
      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="q" className="text-sm font-medium">
            Buscar
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="q"
              name="q"
              defaultValue={initialQuery}
              placeholder="Nombre de producto o SKU"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="warehouseId" className="text-sm font-medium">
            Almacén
          </label>
          <select
            id="warehouseId"
            name="warehouseId"
            defaultValue={initialWarehouseId}
            className="flex h-8 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <option value="">Todos los almacenes</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="stockStatus" className="text-sm font-medium">
            Estado de stock
          </label>
          <select
            id="stockStatus"
            name="stockStatus"
            defaultValue={initialStockStatus}
            className="flex h-8 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <option value="all">Todos los estados</option>
            <option value="in_stock">En stock</option>
            <option value="low_stock">Stock bajo</option>
            <option value="out_of_stock">Sin stock</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit">Aplicar</Button>
        {hasActiveFilters && (
          <Button type="button" variant="outline" onPress={() => router.push("/inventory")}>
            <X data-icon="inline-start" />
            Restablecer
          </Button>
        )}
      </div>
    </form>
  )
}
