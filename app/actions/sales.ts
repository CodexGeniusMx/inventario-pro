"use server"

import { revalidatePath } from "next/cache"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { requirePermission } from "@/lib/auth/session"
import { createSaleSchema } from "@/lib/validations/sale.schema"
import * as saleService from "@/services/sales/sale.service"
import type { VariantSalePrice } from "@/types/sales"

export async function createSaleAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("sales", "complete")
    const parsed = createSaleSchema.parse(input)
    const sale = await saleService.createAndCompleteSale(user, parsed)
    revalidatePath("/sales")
    revalidatePath("/inventory")
    revalidatePath("/inventory/movements")
    return actionSuccess(sale)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function getVariantSalePricesAction(
  variantIds: string[]
): Promise<ActionResult<{ prices: VariantSalePrice[] }>> {
  try {
    const user = await requirePermission("sales", "write")
    const prices = await saleService.getVariantSalePrices(user, variantIds)
    return actionSuccess({ prices })
  } catch (error) {
    return toActionResult(error)
  }
}
