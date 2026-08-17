"use server"

import { revalidatePath } from "next/cache"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { requirePermission } from "@/lib/auth/session"
import { processReturnSchema } from "@/lib/validations/return.schema"
import * as returnService from "@/services/returns/return.service"

export async function processReturnAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("returns", "write")
    const parsed = processReturnSchema.parse(input)
    const result = await returnService.processReturn(user, parsed)
    revalidatePath("/returns")
    revalidatePath("/sales")
    revalidatePath(`/sales/${parsed.saleId}`)
    revalidatePath("/inventory")
    revalidatePath("/inventory/movements")
    return actionSuccess(result)
  } catch (error) {
    return toActionResult(error)
  }
}
