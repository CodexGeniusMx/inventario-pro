import { redirect } from "next/navigation"

import { PurchaseOrderForm } from "@/components/purchases/purchase-order-form"
import { PageHeader } from "@/components/layout/page-header"
import { requireAdmin } from "@/lib/auth/session"
import { listVariantOptions } from "@/services/inventory/inventory.service"
import {
  getDefaultWarehouse,
  listWarehouses,
} from "@/services/inventory/warehouse.service"
import { listSupplierOptions } from "@/services/parties/supplier.service"

export default async function NewPurchasePage() {
  let user

  try {
    user = await requireAdmin()
  } catch {
    redirect("/purchases")
  }

  const [suppliers, warehouses, variants, defaultWarehouse] = await Promise.all([
    listSupplierOptions(user),
    listWarehouses(user, { activeOnly: true }),
    listVariantOptions(user),
    getDefaultWarehouse(user),
  ])

  return (
    <>
      <PageHeader
        title="Nueva orden de compra"
        description="Ordena inventario de un proveedor. El stock no se actualiza hasta la recepción."
      />

      <PurchaseOrderForm
        suppliers={suppliers}
        warehouses={warehouses}
        variants={variants}
        defaultWarehouseId={defaultWarehouse?.id ?? user.defaultWarehouseId ?? undefined}
        allowedCurrencies={user.organizationAllowedCurrencies}
        defaultCurrency={user.organizationBaseCurrency}
      />
    </>
  )
}
