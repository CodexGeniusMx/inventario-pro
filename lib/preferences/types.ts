export type ThemePreference = "light" | "dark" | "system"
export type DensityPreference = "compact" | "normal" | "comfortable"
export type TextSizePreference = "normal" | "large"

export type UserPreferences = {
  theme: ThemePreference
  density: DensityPreference
  textSize: TextSizePreference
  reduceMotion: boolean
  highContrast: boolean
  notificationsInApp: boolean
  notificationsEmailEnabled: boolean
  notificationsWhatsappEnabled: boolean
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "system",
  density: "normal",
  textSize: "normal",
  reduceMotion: false,
  highContrast: false,
  notificationsInApp: true,
  notificationsEmailEnabled: false,
  notificationsWhatsappEnabled: false,
}

export const PREFERENCE_COOKIE_NAME = "keep-prefs"

export function serializePreferencesCookie(preferences: UserPreferences): string {
  return encodeURIComponent(
    JSON.stringify({
      t: preferences.theme,
      d: preferences.density,
      s: preferences.textSize,
      rm: preferences.reduceMotion ? 1 : 0,
      hc: preferences.highContrast ? 1 : 0,
    })
  )
}

export function parsePreferencesCookie(value: string | undefined): Partial<UserPreferences> {
  if (!value) {
    return {}
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as {
      t?: ThemePreference
      d?: DensityPreference
      s?: TextSizePreference
      rm?: number
      hc?: number
    }

    return {
      theme: parsed.t,
      density: parsed.d,
      textSize: parsed.s,
      reduceMotion: parsed.rm === 1,
      highContrast: parsed.hc === 1,
    }
  } catch {
    return {}
  }
}

export function mergePreferences(
  base: UserPreferences,
  patch: Partial<UserPreferences>
): UserPreferences {
  return {
    ...base,
    ...patch,
  }
}
