"use server"

import { revalidatePath } from "next/cache"

import {
  actionSuccess,
  toActionResult,
  type ActionResult,
} from "@/lib/errors/action-result"
import { requireSettingsAccessOrRedirect } from "@/lib/auth/session"
import {
  updateAiSettings,
  updateCompanySettings,
  updateCurrencySettings,
  updateInventorySettings,
  updateWhatsappSettings,
} from "@/services/settings/organization.service"
import {
  companySettingsSchema,
  currencySettingsSchema,
  inventorySettingsSchema,
  aiSettingsSchema,
  whatsappSettingsSchema,
} from "@/lib/validations/settings.schema"

export async function updateCompanySettingsAction(
  input: unknown
): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireSettingsAccessOrRedirect()
    const parsed = companySettingsSchema.parse(input)
    await updateCompanySettings(user, parsed)
    revalidatePath("/settings")
    return actionSuccess({ message: "Configuración de empresa actualizada." })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateCurrencySettingsAction(
  input: unknown
): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireSettingsAccessOrRedirect()
    const parsed = currencySettingsSchema.parse(input)
    await updateCurrencySettings(user, parsed)
    revalidatePath("/settings")
    revalidatePath("/purchases")
    revalidatePath("/products")
    return actionSuccess({ message: "Configuración de monedas actualizada." })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateInventorySettingsAction(
  input: unknown
): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireSettingsAccessOrRedirect()
    const parsed = inventorySettingsSchema.parse(input)
    await updateInventorySettings(user, parsed)
    revalidatePath("/settings")
    revalidatePath("/inventory")
    return actionSuccess({ message: "Configuración de inventario actualizada." })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateAiSettingsAction(
  input: unknown
): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireSettingsAccessOrRedirect()
    const parsed = aiSettingsSchema.parse(input)
    await updateAiSettings(user, parsed)
    revalidatePath("/settings")
    return actionSuccess({ message: "Configuración de Keep AI actualizada." })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateWhatsappSettingsAction(
  input: unknown
): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireSettingsAccessOrRedirect()
    const parsed = whatsappSettingsSchema.parse(input)
    await updateWhatsappSettings(user, parsed)
    revalidatePath("/settings")
    return actionSuccess({ message: "Configuración de WhatsApp actualizada." })
  } catch (error) {
    return toActionResult(error)
  }
}
