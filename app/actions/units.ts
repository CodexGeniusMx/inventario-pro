"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { requireUser } from "@/lib/auth/session"
import { assertCanManageUnits } from "@/lib/auth/product-permissions"
import { createOrganizationUnit } from "@/services/catalog/unit.service"

const unitLabelSchema = z.object({
  label: z.string().trim().min(1, "El nombre de la unidad es obligatorio."),
})

export async function createUnitAction(
  input: unknown
): Promise<ActionResult<{ id: string; code: string; label: string }>> {
  try {
    const user = await requireUser()
    assertCanManageUnits(user)
    const parsed = unitLabelSchema.parse(input)
    const unit = await createOrganizationUnit(user, parsed.label)
    revalidatePath("/products")
    return actionSuccess({
      id: unit.id,
      code: unit.code,
      label: unit.label,
    })
  } catch (error) {
    return toActionResult(error)
  }
}
