import { notFound, redirect } from "next/navigation"

import { InventorySubNav } from "@/components/inventory/inventory-sub-nav"
import { WarehouseForm } from "@/components/inventory/warehouse-form"
import { PageHeader } from "@/components/layout/page-header"
import { isAdmin } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { NotFoundError } from "@/lib/errors/app-error"
import { getWarehouseById } from "@/services/inventory/warehouse.service"

type EditWarehousePageProps = {
  params: Promise<{ id: string }>
}

export default async function EditWarehousePage({
  params,
}: EditWarehousePageProps) {
  const user = await requireUser()

  if (!isAdmin(user)) {
    redirect("/inventory/warehouses")
  }

  const { id } = await params

  let warehouse

  try {
    warehouse = await getWarehouseById(user, id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }

    throw error
  }

  return (
    <>
      <PageHeader
        title={`Editar ${warehouse.name}`}
        description="Actualiza detalles del almacén, estado predeterminado y estado activo."
      />

      <InventorySubNav />

      <WarehouseForm mode="edit" warehouse={warehouse} />
    </>
  )
}
