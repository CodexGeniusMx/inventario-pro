"use server"

import { revalidatePath } from "next/cache"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { requirePermission } from "@/lib/auth/session"
import {
  createProductSchema,
  updateProductSchema,
} from "@/lib/validations/product.schema"
import * as productService from "@/services/catalog/product.service"

export async function createProductAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("products", "write")
    const parsed = createProductSchema.parse(input)
    const product = await productService.createProduct(user, parsed)
    revalidatePath("/products")
    return actionSuccess(product)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateProductAction(
  productId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("products", "write")
    const parsed = updateProductSchema.parse(input)
    const product = await productService.updateProduct(user, productId, parsed)
    revalidatePath("/products")
    revalidatePath(`/products/${productId}`)
    return actionSuccess(product)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function archiveProductAction(
  productId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("products", "write")
    await productService.archiveProduct(user, productId)
    revalidatePath("/products")
    revalidatePath(`/products/${productId}`)
    return actionSuccess({ id: productId })
  } catch (error) {
    return toActionResult(error)
  }
}
