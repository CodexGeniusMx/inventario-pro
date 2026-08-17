import { Plus } from "lucide-react"

import { InventoryErrorState } from "@/components/inventory/inventory-error-state"
import { InventorySubNav } from "@/components/inventory/inventory-sub-nav"
import { WarehousesTable } from "@/components/inventory/warehouses-table"
import { PageHeader } from "@/components/layout/page-header"
import { LinkButton } from "@/components/ui/button"
import { isAdmin } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { listWarehouses } from "@/services/inventory/warehouse.service"

export default async function WarehousesPage() {
  const user = await requirePermission("inventory", "read")
  const canManage = isAdmin(user)

  let warehouses: Awaited<ReturnType<typeof listWarehouses>> = []
  let loadError: string | null = null

  try {
    warehouses = await listWarehouses(user)
  } catch {
    loadError = "Unable to load warehouses."
  }

  return (
    <>
      <PageHeader
        title="Warehouses"
        description="Manage warehouse locations used for inventory balances and movements."
        actions={
          canManage ? (
            <LinkButton href="/inventory/warehouses/new">
              <Plus data-icon="inline-start" />
              New warehouse
            </LinkButton>
          ) : undefined
        }
      />

      <InventorySubNav />

      {loadError ? (
        <InventoryErrorState message={loadError} />
      ) : warehouses.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No warehouses configured yet.
          {canManage && (
            <div className="mt-4">
              <LinkButton href="/inventory/warehouses/new">
                Create warehouse
              </LinkButton>
            </div>
          )}
        </div>
      ) : (
        <WarehousesTable warehouses={warehouses} canManage={canManage} />
      )}
    </>
  )
}
