import { redirect } from "next/navigation"

import { AdjustmentForm } from "@/components/inventory/adjustment-form"
import { InventorySubNav } from "@/components/inventory/inventory-sub-nav"
import { PageHeader } from "@/components/layout/page-header"
import { hasPermission } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import {
  listVariantOptions,
} from "@/services/inventory/inventory.service"
import {
  getDefaultWarehouse,
  listWarehouses,
} from "@/services/inventory/warehouse.service"
import type { StockAdjustmentType } from "@/types/inventory"

type NewAdjustmentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

const allowedTypes: StockAdjustmentType[] = [
  "initial_stock",
  "increase",
  "decrease",
  "damage",
  "loss",
]

export default async function NewAdjustmentPage({
  searchParams,
}: NewAdjustmentPageProps) {
  const user = await requireUser()

  if (!hasPermission(user, "inventory", "adjust")) {
    redirect("/inventory/adjustments")
  }

  const rawParams = await searchParams
  const requestedType = getParam(rawParams.type)
  const initialAdjustmentType = allowedTypes.includes(
    requestedType as StockAdjustmentType
  )
    ? (requestedType as StockAdjustmentType)
    : "increase"

  const [warehouses, variants, defaultWarehouse] = await Promise.all([
    listWarehouses(user, { activeOnly: true }),
    listVariantOptions(user),
    getDefaultWarehouse(user),
  ])

  return (
    <>
      <PageHeader
        title="Nuevo ajuste de stock"
        description="Los ajustes actualizan saldos de forma atómica y crean registros de movimiento inmutables."
      />

      <InventorySubNav />

      <AdjustmentForm
        warehouses={warehouses}
        variants={variants}
        defaultWarehouseId={defaultWarehouse?.id}
        initialAdjustmentType={initialAdjustmentType}
      />
    </>
  )
}
