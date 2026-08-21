"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import type { UserPreferences } from "@/lib/preferences/types"
import { DEFAULT_USER_PREFERENCES } from "@/lib/preferences/types"
import { applyUserPreferencesToDocument } from "@/lib/preferences/apply"

type PreferencesContextValue = {
  preferences: UserPreferences
  setPreferences: (patch: Partial<UserPreferences>) => void
  replacePreferences: (next: UserPreferences) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

type PreferencesProviderProps = {
  initialPreferences: UserPreferences
  children: React.ReactNode
}

export function PreferencesProvider({
  initialPreferences,
  children,
}: PreferencesProviderProps) {
  const [preferences, setPreferencesState] = useState<UserPreferences>(
    mergeWithDefaults(initialPreferences)
  )

  useEffect(() => {
    applyUserPreferencesToDocument(preferences)
  }, [preferences])

  const setPreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferencesState((current) => ({
      ...current,
      ...patch,
    }))
  }, [])

  const replacePreferences = useCallback((next: UserPreferences) => {
    setPreferencesState(mergeWithDefaults(next))
  }, [])

  const value = useMemo(
    () => ({
      preferences,
      setPreferences,
      replacePreferences,
    }),
    [preferences, setPreferences, replacePreferences]
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function useUserPreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext)

  if (!context) {
    return {
      preferences: DEFAULT_USER_PREFERENCES,
      setPreferences: () => undefined,
      replacePreferences: () => undefined,
    }
  }

  return context
}

function mergeWithDefaults(preferences: UserPreferences): UserPreferences {
  return {
    ...DEFAULT_USER_PREFERENCES,
    ...preferences,
  }
}
