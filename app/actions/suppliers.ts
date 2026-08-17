"use server"

import { revalidatePath } from "next/cache"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { requireAdmin } from "@/lib/auth/session"
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "@/lib/validations/supplier.schema"
import * as supplierService from "@/services/parties/supplier.service"

export async function createSupplierAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireAdmin()
    const parsed = createSupplierSchema.parse(input)
    const supplier = await supplierService.createSupplier(user, parsed)
    revalidatePath("/suppliers")
    return actionSuccess(supplier)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateSupplierAction(
  supplierId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireAdmin()
    const parsed = updateSupplierSchema.parse(input)
    const supplier = await supplierService.updateSupplier(
      user,
      supplierId,
      parsed
    )
    revalidatePath("/suppliers")
    revalidatePath(`/suppliers/${supplierId}`)
    revalidatePath(`/suppliers/${supplierId}/edit`)
    return actionSuccess(supplier)
  } catch (error) {
    return toActionResult(error)
  }
}
