"use server"

import { revalidatePath } from "next/cache"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { requireUser } from "@/lib/auth/session"
import {
  assertCanArchiveProducts,
  assertCanCreateProducts,
  assertCanEditProducts,
  assertCanViewProducts,
  canViewProducts,
} from "@/lib/auth/product-permissions"
import { ForbiddenError } from "@/lib/errors/app-error"
import {
  createProductSchema,
  updateProductSchema,
} from "@/lib/validations/product.schema"
import * as productService from "@/services/catalog/product.service"

async function requireProductViewAccess() {
  const user = await requireUser()
  assertCanViewProducts(user)
  return user
}

async function requireProductCreateAccess() {
  const user = await requireUser()
  assertCanCreateProducts(user)
  return user
}

async function requireProductEditAccess() {
  const user = await requireUser()
  assertCanEditProducts(user)
  return user
}

async function requireProductArchiveAccess() {
  const user = await requireUser()
  assertCanArchiveProducts(user)
  return user
}

export async function createProductAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireProductCreateAccess()
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
    const user = await requireProductEditAccess()
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
    const user = await requireProductArchiveAccess()
    await productService.archiveProduct(user, productId)
    revalidatePath("/products")
    revalidatePath(`/products/${productId}`)
    return actionSuccess({ id: productId })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function reactivateProductAction(
  productId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireProductArchiveAccess()
    await productService.reactivateProduct(user, productId)
    revalidatePath("/products")
    revalidatePath(`/products/${productId}`)
    return actionSuccess({ id: productId })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function assertProductPageAccess(
  mode: "view" | "create" | "edit" | "archive"
): Promise<{ allowed: false } | { allowed: true; user: Awaited<ReturnType<typeof requireUser>> }> {
  try {
    const user = await requireUser()

    if (mode === "view") {
      assertCanViewProducts(user)
    } else if (mode === "create") {
      assertCanCreateProducts(user)
    } else if (mode === "edit") {
      assertCanEditProducts(user)
    } else {
      assertCanArchiveProducts(user)
    }

    return { allowed: true, user }
  } catch {
    return { allowed: false }
  }
}

export async function requireProductPageAccess(
  mode: "view" | "create" | "edit"
): Promise<Awaited<ReturnType<typeof requireUser>>> {
  const user = await requireUser()

  if (mode === "view" && !canViewProducts(user)) {
    throw new ForbiddenError("No tienes permiso para consultar productos.")
  }

  if (mode === "create") {
    assertCanCreateProducts(user)
  }

  if (mode === "edit") {
    assertCanEditProducts(user)
  }

  return user
}
