"use server"

import { revalidatePath } from "next/cache"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { hasAnyPermission } from "@/lib/auth/permissions"
import { requirePermission, requireUser } from "@/lib/auth/session"
import { ForbiddenError } from "@/lib/errors/app-error"
import {
  createPurchaseSchema,
  receivePurchaseSchema,
} from "@/lib/validations/purchase.schema"
import * as purchaseService from "@/services/purchasing/purchase.service"

export async function createPurchaseAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
    try {
    const user = await requireUser()
    if (
      !hasAnyPermission(user, [
        { resource: "purchases", action: "create" },
        { resource: "purchases", action: "write" },
      ])
    ) {
      throw new ForbiddenError()
    }
    const parsed = createPurchaseSchema.parse(input)
    const purchase = await purchaseService.createPurchaseOrder(user, parsed)
    revalidatePath("/purchases")
    return actionSuccess(purchase)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function receivePurchaseAction(
  input: unknown
): Promise<ActionResult<{ receiptId: string }>> {
  try {
    const user = await requirePermission("purchases", "receive")
    const parsed = receivePurchaseSchema.parse(input)
    const receipt = await purchaseService.receivePurchaseOrder(user, parsed)
    revalidatePath("/purchases")
    revalidatePath(`/purchases/${parsed.purchaseOrderId}`)
    revalidatePath("/inventory")
    revalidatePath("/inventory/movements")
    return actionSuccess(receipt)
  } catch (error) {
    return toActionResult(error)
  }
}
