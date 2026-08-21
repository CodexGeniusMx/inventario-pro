import { AppLayoutClient } from "@/components/layout/app-layout-client"
import { PreferencesProvider } from "@/components/preferences/preferences-provider"
import { requireUserOrRedirect } from "@/lib/auth/session"
import {
  DEFAULT_USER_PREFERENCES,
  mergePreferences,
  parsePreferencesCookie,
  PREFERENCE_COOKIE_NAME,
} from "@/lib/preferences/types"
import { getUserPreferences } from "@/services/preferences/user-preferences.service"
import { cookies } from "next/headers"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUserOrRedirect("/login")
  const cookieStore = await cookies()
  const cookiePreferences = parsePreferencesCookie(
    cookieStore.get(PREFERENCE_COOKIE_NAME)?.value
  )

  let preferences = DEFAULT_USER_PREFERENCES

  try {
    preferences = mergePreferences(await getUserPreferences(user), cookiePreferences)
  } catch {
    preferences = mergePreferences(DEFAULT_USER_PREFERENCES, cookiePreferences)
  }

  return (
    <PreferencesProvider initialPreferences={preferences}>
      <AppLayoutClient user={user}>{children}</AppLayoutClient>
    </PreferencesProvider>
  )
}
