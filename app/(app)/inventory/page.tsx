import { Suspense } from "react"
import { Plus } from "lucide-react"

import { InventoryEmptyState } from "@/components/inventory/inventory-empty-state"
import { InventoryErrorState } from "@/components/inventory/inventory-error-state"
import { InventoryFilters } from "@/components/inventory/inventory-filters"
import { InventorySubNav } from "@/components/inventory/inventory-sub-nav"
import { InventoryTable } from "@/components/inventory/inventory-table"
import { PageHeader } from "@/components/layout/page-header"
import { LinkButton } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { inventoryListFiltersSchema } from "@/lib/validations/inventory.schema"
import { listInventoryStatus } from "@/services/inventory/inventory.service"
import { listWarehouses } from "@/services/inventory/warehouse.service"

type InventoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function FiltersFallback() {
  return <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const user = await requirePermission("inventory", "read")
  const canAdjust = hasPermission(user, "inventory", "adjust")
  const rawParams = await searchParams

  const parsedFilters = inventoryListFiltersSchema.safeParse({
    q: getParam(rawParams.q),
    warehouseId: getParam(rawParams.warehouseId),
    stockStatus: getParam(rawParams.stockStatus) ?? "all",
  })

  const filters = parsedFilters.success
    ? {
        q: parsedFilters.data.q,
        warehouseId: parsedFilters.data.warehouseId || undefined,
        stockStatus: parsedFilters.data.stockStatus ?? "all",
      }
    : { stockStatus: "all" as const }

  let warehouses: Awaited<ReturnType<typeof listWarehouses>> = []
  let items: Awaited<ReturnType<typeof listInventoryStatus>> = []
  let loadError: string | null = null

  try {
    warehouses = await listWarehouses(user, { activeOnly: false })

    if (warehouses.some((warehouse) => warehouse.isActive)) {
      items = await listInventoryStatus(user, filters)
    }
  } catch {
    loadError = "Unable to load inventory from the database."
  }

  const hasWarehouse = warehouses.some((warehouse) => warehouse.isActive)
  const hasFilters = Boolean(
    filters.q || filters.warehouseId || filters.stockStatus !== "all"
  )

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Current stock levels by warehouse with low-stock visibility."
        actions={
          canAdjust && hasWarehouse ? (
            <div className="flex items-center gap-2">
              <LinkButton href="/inventory/adjustments/new" variant="outline">
                Record adjustment
              </LinkButton>
              <LinkButton href="/inventory/adjustments/new?type=initial_stock">
                <Plus data-icon="inline-start" />
                Initial stock
              </LinkButton>
            </div>
          ) : undefined
        }
      />

      <InventorySubNav />

      {hasWarehouse && (
        <Suspense fallback={<FiltersFallback />}>
          <InventoryFilters
            warehouses={warehouses.filter((warehouse) => warehouse.isActive)}
            initialQuery={filters.q}
            initialWarehouseId={filters.warehouseId}
            initialStockStatus={filters.stockStatus}
          />
        </Suspense>
      )}

      {loadError ? (
        <InventoryErrorState message={loadError} />
      ) : !hasWarehouse ? (
        <InventoryEmptyState
          hasFilters={false}
          canAdjust={canAdjust}
          hasWarehouse={false}
        />
      ) : items.length === 0 ? (
        <InventoryEmptyState
          hasFilters={hasFilters}
          canAdjust={canAdjust}
          hasWarehouse
        />
      ) : (
        <InventoryTable items={items} />
      )}
    </>
  )
}
