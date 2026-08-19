import type { AuthenticatedUser } from "@/lib/auth/types"
import { ConflictError, ValidationError } from "@/lib/errors/app-error"
import { assertCanManageUnits } from "@/lib/auth/product-permissions"
import { createClient } from "@/lib/supabase/server"

export type UnitOption = {
  id: string
  code: string
  label: string
  isSystem: boolean
}

const DEFAULT_UNITS: UnitOption[] = [
  { id: "default-unit", code: "unit", label: "Unidad", isSystem: true },
  { id: "default-piece", code: "piece", label: "Pieza", isSystem: true },
  { id: "default-box", code: "box", label: "Caja", isSystem: true },
  { id: "default-pack", code: "pack", label: "Paquete", isSystem: true },
  { id: "default-pair", code: "pair", label: "Par", isSystem: true },
  { id: "default-dozen", code: "dozen", label: "Docena", isSystem: true },
  { id: "default-kg", code: "kg", label: "Kilogramo", isSystem: true },
  { id: "default-g", code: "g", label: "Gramo", isSystem: true },
  { id: "default-l", code: "l", label: "Litro", isSystem: true },
  { id: "default-ml", code: "ml", label: "Mililitro", isSystem: true },
  { id: "default-m", code: "m", label: "Metro", isSystem: true },
  { id: "default-roll", code: "roll", label: "Rollo", isSystem: true },
]

function normalizeUnitKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
}

function toUnitCode(label: string): string {
  const normalized = normalizeUnitKey(label).replace(/\s+/g, "_")
  return normalized.slice(0, 32) || "custom_unit"
}

export async function listOrganizationUnits(
  user: AuthenticatedUser
): Promise<UnitOption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("organization_units")
    .select("id, code, label, is_system")
    .eq("organization_id", user.organizationId)
    .eq("is_active", true)
    .order("label", { ascending: true })

  if (error) {
    if (error.code === "42P01") {
      return DEFAULT_UNITS
    }
    throw error
  }

  const units = (data ?? []).map((unit) => ({
    id: unit.id,
    code: unit.code,
    label: unit.label,
    isSystem: unit.is_system,
  }))

  return units.length > 0 ? units : DEFAULT_UNITS
}

export async function createOrganizationUnit(
  user: AuthenticatedUser,
  label: string
): Promise<UnitOption> {
  assertCanManageUnits(user)

  const trimmed = label.trim()
  if (!trimmed) {
    throw new ValidationError("El nombre de la unidad es obligatorio.")
  }

  const normalizedKey = normalizeUnitKey(trimmed)
  const supabase = await createClient()

  const { data: existing, error: existingError } = await supabase
    .from("organization_units")
    .select("id")
    .eq("organization_id", user.organizationId)
    .eq("normalized_key", normalizedKey)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existing) {
    throw new ConflictError("Ya existe una unidad equivalente en el catálogo.")
  }

  const { data, error } = await supabase
    .from("organization_units")
    .insert({
      organization_id: user.organizationId,
      code: toUnitCode(trimmed),
      label: trimmed,
      normalized_key: normalizedKey,
      is_system: false,
      is_active: true,
    })
    .select("id, code, label, is_system")
    .single()

  if (error) {
    throw error
  }

  return {
    id: data.id,
    code: data.code,
    label: data.label,
    isSystem: data.is_system,
  }
}

export function resolveUnitLabel(
  units: UnitOption[],
  storedValue: string
): string {
  const normalized = normalizeUnitKey(storedValue)
  const match = units.find(
    (unit) =>
      unit.code === storedValue ||
      normalizeUnitKey(unit.label) === normalized ||
      normalizeUnitKey(unit.code) === normalized
  )

  return match?.label ?? storedValue
}
