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
    loadError = "No se pudieron cargar los almacenes."
  }

  return (
    <>
      <PageHeader
        title="Almacenes"
        description="Administra ubicaciones de almacén usadas para saldos y movimientos de inventario."
        actions={
          canManage ? (
            <LinkButton href="/inventory/warehouses/new">
              <Plus data-icon="inline-start" />
              Nuevo almacén
            </LinkButton>
          ) : undefined
        }
      />

      <InventorySubNav />

      {loadError ? (
        <InventoryErrorState message={loadError} />
      ) : warehouses.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Aún no hay almacenes configurados.
          {canManage && (
            <div className="mt-4">
              <LinkButton href="/inventory/warehouses/new">
                Crear almacén
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
