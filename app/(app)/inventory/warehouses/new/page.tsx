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
        title="New warehouse"
        description="Create a warehouse for inventory tracking. The first warehouse becomes the default."
      />

      <InventorySubNav />

      <WarehouseForm mode="create" />
    </>
  )
}
