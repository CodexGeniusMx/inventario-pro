import type { SupabaseClient } from "@supabase/supabase-js"

import type { AuthenticatedUser } from "@/lib/auth/types"
import type { Database } from "@/lib/database.types"
import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "@/lib/preferences/types"
import { createClient } from "@/lib/supabase/server"

type PreferencesRow = {
  theme: string
  density: string
  text_size: string
  reduce_motion: boolean
  high_contrast: boolean
  notifications_in_app: boolean
  notifications_email_enabled: boolean
  notifications_whatsapp_enabled: boolean
}

function mapPreferencesRow(
  row: PreferencesRow | Database["public"]["Tables"]["user_preferences"]["Row"]
): UserPreferences {
  return {
    theme: (row.theme as UserPreferences["theme"]) ?? DEFAULT_USER_PREFERENCES.theme,
    density:
      (row.density as UserPreferences["density"]) ?? DEFAULT_USER_PREFERENCES.density,
    textSize:
      (row.text_size as UserPreferences["textSize"]) ??
      DEFAULT_USER_PREFERENCES.textSize,
    reduceMotion: row.reduce_motion ?? DEFAULT_USER_PREFERENCES.reduceMotion,
    highContrast: row.high_contrast ?? DEFAULT_USER_PREFERENCES.highContrast,
    notificationsInApp:
      row.notifications_in_app ?? DEFAULT_USER_PREFERENCES.notificationsInApp,
    notificationsEmailEnabled:
      row.notifications_email_enabled ??
      DEFAULT_USER_PREFERENCES.notificationsEmailEnabled,
    notificationsWhatsappEnabled:
      row.notifications_whatsapp_enabled ??
      DEFAULT_USER_PREFERENCES.notificationsWhatsappEnabled,
  }
}

export async function getUserPreferences(
  user: AuthenticatedUser
): Promise<UserPreferences> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("get_or_create_user_preferences")

  if (error) {
    if (error.code === "42883" || error.code === "PGRST202") {
      return DEFAULT_USER_PREFERENCES
    }

    throw error
  }

  const row = Array.isArray(data) ? data[0] : data

  if (!row) {
    return DEFAULT_USER_PREFERENCES
  }

  return mapPreferencesRow(row)
}

export async function updateUserPreferences(
  user: AuthenticatedUser,
  patch: Partial<UserPreferences>
): Promise<UserPreferences> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("upsert_user_preferences", {
    p_theme: patch.theme ?? null,
    p_density: patch.density ?? null,
    p_text_size: patch.textSize ?? null,
    p_reduce_motion: patch.reduceMotion ?? null,
    p_high_contrast: patch.highContrast ?? null,
    p_notifications_in_app: patch.notificationsInApp ?? null,
    p_notifications_email_enabled: patch.notificationsEmailEnabled ?? null,
    p_notifications_whatsapp_enabled: patch.notificationsWhatsappEnabled ?? null,
  })

  if (error) {
    throw error
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    throw new Error("preferences_update_failed")
  }
  return mapPreferencesRow(row)
}

export async function updateProfileName(
  user: AuthenticatedUser,
  fullName: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", user.id)
    .eq("organization_id", user.organizationId)

  if (error) {
    throw error
  }
}

export type ProfileSummary = {
  fullName: string
  email: string
  role: AuthenticatedUser["role"]
  organizationName: string
}

export function getProfileSummary(user: AuthenticatedUser): ProfileSummary {
  return {
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    organizationName: user.organizationName,
  }
}

export async function loadPreferencesForClient(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select(
      "theme, density, text_size, reduce_motion, high_contrast, notifications_in_app, notifications_email_enabled, notifications_whatsapp_enabled"
    )
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      return DEFAULT_USER_PREFERENCES
    }

    throw error
  }

  if (!data) {
    return DEFAULT_USER_PREFERENCES
  }

  return mapPreferencesRow(data as PreferencesRow)
}
