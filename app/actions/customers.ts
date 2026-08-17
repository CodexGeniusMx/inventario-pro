"use server"

import { revalidatePath } from "next/cache"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { requirePermission } from "@/lib/auth/session"
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "@/lib/validations/customer.schema"
import * as customerService from "@/services/parties/customer.service"

export async function createCustomerAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("customers", "write")
    const parsed = createCustomerSchema.parse(input)
    const customer = await customerService.createCustomer(user, parsed)
    revalidatePath("/customers")
    return actionSuccess(customer)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateCustomerAction(
  customerId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("customers", "write")
    const parsed = updateCustomerSchema.parse(input)
    const customer = await customerService.updateCustomer(
      user,
      customerId,
      parsed
    )
    revalidatePath("/customers")
    revalidatePath(`/customers/${customerId}`)
    revalidatePath(`/customers/${customerId}/edit`)
    return actionSuccess(customer)
  } catch (error) {
    return toActionResult(error)
  }
}
