"use server"

import { revalidatePath } from "next/cache"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { requireAdmin, requirePermission } from "@/lib/auth/session"
import {
  createStockAdjustmentSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
} from "@/lib/validations/inventory.schema"
import * as inventoryService from "@/services/inventory/inventory.service"
import * as warehouseService from "@/services/inventory/warehouse.service"

export async function createStockAdjustmentAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("inventory", "adjust")
    const parsed = createStockAdjustmentSchema.parse(input)
    const adjustment = await inventoryService.createStockAdjustment(user, parsed)
    revalidatePath("/inventory")
    revalidatePath("/inventory/movements")
    revalidatePath("/inventory/adjustments")
    return actionSuccess(adjustment)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function getVariantBalanceAction(
  warehouseId: string,
  productVariantId: string
): Promise<
  ActionResult<{
    quantityOnHand: number
    reorderPoint: number
    stockStatus: string | null
  }>
> {
  try {
    const user = await requirePermission("inventory", "read")
    const balance = await inventoryService.getVariantBalance(
      user,
      warehouseId,
      productVariantId
    )
    return actionSuccess(balance)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function createWarehouseAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireAdmin()
    const parsed = createWarehouseSchema.parse(input)
    const warehouse = await warehouseService.createWarehouse(user, parsed)
    revalidatePath("/inventory")
    revalidatePath("/inventory/warehouses")
    return actionSuccess(warehouse)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateWarehouseAction(
  warehouseId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireAdmin()
    const parsed = updateWarehouseSchema.parse(input)
    const warehouse = await warehouseService.updateWarehouse(
      user,
      warehouseId,
      parsed
    )
    revalidatePath("/inventory")
    revalidatePath("/inventory/warehouses")
    revalidatePath(`/inventory/warehouses/${warehouseId}/edit`)
    return actionSuccess(warehouse)
  } catch (error) {
    return toActionResult(error)
  }
}
