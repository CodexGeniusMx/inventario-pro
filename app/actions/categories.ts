"use server"

import { revalidatePath } from "next/cache"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { requireUser } from "@/lib/auth/session"
import { assertCanManageCategories } from "@/lib/auth/product-permissions"
import { z } from "zod"
import {
  archiveCategory,
  createCategory,
  renameCategory,
} from "@/services/catalog/category.service"

const categoryNameSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
})

const categoryIdSchema = z.object({
  categoryId: z.string().uuid(),
})

export async function createCategoryAction(
  input: unknown
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const user = await requireUser()
    assertCanManageCategories(user)
    const parsed = categoryNameSchema.parse(input)
    const category = await createCategory(user, parsed.name)
    revalidatePath("/products")
    return actionSuccess(category)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function renameCategoryAction(
  input: unknown
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const user = await requireUser()
    assertCanManageCategories(user)
    const parsed = categoryIdSchema
      .merge(categoryNameSchema)
      .parse(input)
    const category = await renameCategory(user, parsed.categoryId, parsed.name)
    revalidatePath("/products")
    return actionSuccess(category)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function archiveCategoryAction(
  input: unknown
): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireUser()
    assertCanManageCategories(user)
    const parsed = categoryIdSchema.parse(input)
    await archiveCategory(user, parsed.categoryId)
    revalidatePath("/products")
    return actionSuccess({ message: "Categoría archivada." })
  } catch (error) {
    return toActionResult(error)
  }
}
