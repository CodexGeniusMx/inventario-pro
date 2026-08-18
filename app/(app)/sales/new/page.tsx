import { redirect } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { SaleForm } from "@/components/sales/sale-form"
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { listCustomerOptions } from "@/services/parties/customer.service"
import { listVariantOptions } from "@/services/inventory/inventory.service"
import {
  getDefaultWarehouse,
  listWarehouses,
} from "@/services/inventory/warehouse.service"

export default async function NewSalePage() {
  const user = await requirePermission("sales", "read")

  if (
    !hasPermission(user, "sales", "write") ||
    !hasPermission(user, "sales", "complete")
  ) {
    redirect("/sales")
  }

  const [customers, warehouses, variants, defaultWarehouse] = await Promise.all([
    listCustomerOptions(user),
    listWarehouses(user, { activeOnly: true }),
    listVariantOptions(user),
    getDefaultWarehouse(user),
  ])

  return (
    <>
      <PageHeader
        title="Nueva venta"
        description="Registra una venta con precios autoritativos del servidor y deducción atómica de stock."
      />

      <SaleForm
        customers={customers}
        warehouses={warehouses}
        variants={variants}
        defaultWarehouseId={defaultWarehouse?.id}
      />
    </>
  )
}
