import { redirect } from "next/navigation"

import { InventorySubNav } from "@/components/inventory/inventory-sub-nav"
import { WarehouseForm } from "@/components/inventory/warehouse-form"
import { PageHeader } from "@/components/layout/page-header"
import { isAdmin } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"

export default async function NewWarehousePage() {
  const user = await requireUser()

  if (!isAdmin(user)) {
    redirect("/inventory/warehouses")
  }

  return (
    <>
      <PageHeader
        title="Nuevo almacén"
        description="Crea un almacén para rastrear inventario. El primer almacén será el predeterminado."
      />

      <InventorySubNav />

      <WarehouseForm mode="create" />
    </>
  )
}
