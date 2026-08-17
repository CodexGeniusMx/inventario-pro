import { Suspense } from "react"

import { InventoryErrorState } from "@/components/inventory/inventory-error-state"
import { InventorySubNav } from "@/components/inventory/inventory-sub-nav"
import { MovementsFilters } from "@/components/inventory/movements-filters"
import { MovementsTable } from "@/components/inventory/movements-table"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/lib/auth/session"
import { movementListFiltersSchema } from "@/lib/validations/inventory.schema"
import { listMovements } from "@/services/inventory/inventory.service"
import { listWarehouses } from "@/services/inventory/warehouse.service"

type MovementsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function FiltersFallback() {
  return <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
}

export default async function MovementsPage({ searchParams }: MovementsPageProps) {
  const user = await requirePermission("inventory", "read")
  const rawParams = await searchParams

  const parsedFilters = movementListFiltersSchema.safeParse({
    q: getParam(rawParams.q),
    warehouseId: getParam(rawParams.warehouseId),
    movementType: getParam(rawParams.movementType) ?? "all",
  })

  const filters = parsedFilters.success
    ? {
        q: parsedFilters.data.q,
        warehouseId: parsedFilters.data.warehouseId || undefined,
        movementType: parsedFilters.data.movementType ?? "all",
      }
    : { movementType: "all" as const }

  let warehouses: Awaited<ReturnType<typeof listWarehouses>> = []
  let movements: Awaited<ReturnType<typeof listMovements>> = []
  let loadError: string | null = null

  try {
    ;[warehouses, movements] = await Promise.all([
      listWarehouses(user, { activeOnly: true }),
      listMovements(user, filters),
    ])
  } catch {
    loadError = "Unable to load inventory movements."
  }

  return (
    <>
      <PageHeader
        title="Inventory movements"
        description="Immutable movement history for traceability and audit."
      />

      <InventorySubNav />

      <Suspense fallback={<FiltersFallback />}>
        <MovementsFilters
          warehouses={warehouses}
          initialQuery={filters.q}
          initialWarehouseId={filters.warehouseId}
          initialMovementType={filters.movementType}
        />
      </Suspense>

      {loadError ? (
        <InventoryErrorState message={loadError} />
      ) : movements.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No movements yet.
        </div>
      ) : (
        <MovementsTable movements={movements} />
      )}
    </>
  )
}
