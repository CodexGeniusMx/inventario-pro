"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

import { requireUser } from "@/lib/auth/session"
import { actionSuccess, toActionResult, type ActionResult } from "@/lib/errors/action-result"
import {
  PREFERENCE_COOKIE_NAME,
  serializePreferencesCookie,
  type UserPreferences,
} from "@/lib/preferences/types"
import {
  getUserPreferences,
  updateProfileName,
  updateUserPreferences,
} from "@/services/preferences/user-preferences.service"

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
})

const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  density: z.enum(["compact", "normal", "comfortable"]),
})

const accessibilitySchema = z.object({
  textSize: z.enum(["normal", "large"]),
  reduceMotion: z.boolean(),
  highContrast: z.boolean(),
  density: z.enum(["compact", "normal", "comfortable"]),
})

const notificationsSchema = z.object({
  notificationsInApp: z.boolean(),
  notificationsEmailEnabled: z.boolean(),
  notificationsWhatsappEnabled: z.boolean(),
})

async function persistPreferenceCookie(preferences: UserPreferences): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(PREFERENCE_COOKIE_NAME, serializePreferencesCookie(preferences), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
}

export async function updateProfileAction(input: {
  fullName: string
}): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireUser()
    const parsed = profileSchema.safeParse(input)

    if (!parsed.success) {
      return toActionResult(parsed.error)
    }

    await updateProfileName(user, parsed.data.fullName)
    revalidatePath("/account/profile")

    return actionSuccess({ message: "Perfil actualizado." })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateAppearancePreferencesAction(input: {
  theme: UserPreferences["theme"]
  density: UserPreferences["density"]
}): Promise<ActionResult<{ preferences: UserPreferences; message: string }>> {
  try {
    const user = await requireUser()
    const parsed = appearanceSchema.safeParse(input)

    if (!parsed.success) {
      return toActionResult(parsed.error)
    }

    const preferences = await updateUserPreferences(user, parsed.data)
    await persistPreferenceCookie(preferences)
    revalidatePath("/account")

    return actionSuccess({
      preferences,
      message: "Preferencias de apariencia guardadas.",
    })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateAccessibilityPreferencesAction(input: {
  textSize: UserPreferences["textSize"]
  reduceMotion: boolean
  highContrast: boolean
  density: UserPreferences["density"]
}): Promise<ActionResult<{ preferences: UserPreferences; message: string }>> {
  try {
    const user = await requireUser()
    const parsed = accessibilitySchema.safeParse(input)

    if (!parsed.success) {
      return toActionResult(parsed.error)
    }

    const preferences = await updateUserPreferences(user, parsed.data)
    await persistPreferenceCookie(preferences)
    revalidatePath("/account")

    return actionSuccess({
      preferences,
      message: "Preferencias de accesibilidad guardadas.",
    })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateNotificationPreferencesAction(input: {
  notificationsInApp: boolean
  notificationsEmailEnabled: boolean
  notificationsWhatsappEnabled: boolean
}): Promise<ActionResult<{ preferences: UserPreferences; message: string }>> {
  try {
    const user = await requireUser()
    const parsed = notificationsSchema.safeParse(input)

    if (!parsed.success) {
      return toActionResult(parsed.error)
    }

    const preferences = await updateUserPreferences(user, parsed.data)
    revalidatePath("/account/notifications")

    return actionSuccess({
      preferences,
      message: "Preferencias de notificaciones guardadas.",
    })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function loadAccountPreferencesAction(): Promise<UserPreferences> {
  const user = await requireUser()
  return getUserPreferences(user)
}
