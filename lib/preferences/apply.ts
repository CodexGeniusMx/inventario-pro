import type { UserPreferences } from "@/lib/preferences/types"
import {
  PREFERENCE_COOKIE_NAME,
  serializePreferencesCookie,
} from "@/lib/preferences/types"

export function applyUserPreferencesToDocument(
  preferences: UserPreferences
): void {
  if (typeof document === "undefined") {
    return
  }

  const root = document.documentElement
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const resolvedTheme =
    preferences.theme === "system"
      ? prefersDark
        ? "dark"
        : "light"
      : preferences.theme

  root.classList.toggle("dark", resolvedTheme === "dark")
  root.dataset.theme = preferences.theme
  root.dataset.density = preferences.density
  root.dataset.textSize = preferences.textSize
  root.dataset.reducedMotion = String(
    preferences.reduceMotion || prefersReducedMotion
  )
  root.dataset.highContrast = String(preferences.highContrast)

  document.cookie = `${PREFERENCE_COOKIE_NAME}=${serializePreferencesCookie(preferences)}; path=/; max-age=31536000; samesite=lax`
}

export function buildInlinePreferenceScript(cookieValue: string | undefined): string {
  const escaped = (cookieValue ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")

  return `(function(){try{var raw=decodeURIComponent('${escaped}');if(!raw)return;var p=JSON.parse(raw);var root=document.documentElement;var dark=p.t==='dark'||(p.t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark)root.classList.add('dark');if(p.d)root.dataset.density=p.d;if(p.s)root.dataset.textSize=p.s;if(p.rm===1||window.matchMedia('(prefers-reduced-motion: reduce)').matches)root.dataset.reducedMotion='true';if(p.hc===1)root.dataset.highContrast='true';}catch(e){}})();`
}

export function resolveThemeClass(preferences: UserPreferences): string {
  return preferences.theme === "dark" ? "dark" : ""
}
