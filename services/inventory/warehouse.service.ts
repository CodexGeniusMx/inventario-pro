import type { PostgrestError } from "@supabase/supabase-js"

import type { AuthenticatedUser } from "@/lib/auth/types"
import { ConflictError, NotFoundError } from "@/lib/errors/app-error"
import { createClient } from "@/lib/supabase/server"
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  WarehouseRow,
} from "@/types/inventory"

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === "23505"
}

function mapWarehouse(row: {
  id: string
  name: string
  code: string
  address: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}): WarehouseRow {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: row.address,
    isDefault: row.is_default,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listWarehouses(
  user: AuthenticatedUser,
  options: { activeOnly?: boolean } = {}
): Promise<WarehouseRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("warehouses")
    .select("id, name, code, address, is_default, is_active, created_at, updated_at")
    .eq("organization_id", user.organizationId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })

  if (options.activeOnly) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map(mapWarehouse)
}

export async function getWarehouseById(
  user: AuthenticatedUser,
  warehouseId: string
): Promise<WarehouseRow> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("warehouses")
    .select("id, name, code, address, is_default, is_active, created_at, updated_at")
    .eq("id", warehouseId)
    .eq("organization_id", user.organizationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Almacén no encontrado.")
  }

  return mapWarehouse(data)
}

export async function getDefaultWarehouse(
  user: AuthenticatedUser
): Promise<WarehouseRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("warehouses")
    .select("id, name, code, address, is_default, is_active, created_at, updated_at")
    .eq("organization_id", user.organizationId)
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapWarehouse(data) : null
}

async function clearDefaultWarehouse(
  organizationId: string,
  excludeWarehouseId?: string
): Promise<void> {
  const supabase = await createClient()

  let query = supabase
    .from("warehouses")
    .update({ is_default: false })
    .eq("organization_id", organizationId)
    .eq("is_default", true)

  if (excludeWarehouseId) {
    query = query.neq("id", excludeWarehouseId)
  }

  const { error } = await query

  if (error) {
    throw error
  }
}

export async function createWarehouse(
  user: AuthenticatedUser,
  input: CreateWarehouseInput
): Promise<{ id: string }> {
  const supabase = await createClient()
  const organizationId = user.organizationId

  const existing = await listWarehouses(user)
  const shouldBeDefault =
    input.isDefault === true || existing.length === 0

  if (shouldBeDefault) {
    await clearDefaultWarehouse(organizationId)
  }

  const { data, error } = await supabase
    .from("warehouses")
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      address: input.address ?? null,
      is_default: shouldBeDefault,
      is_active: input.isActive ?? true,
    })
    .select("id")
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Ya existe un almacén con este código.")
    }

    throw error
  }

  return { id: data.id }
}

export async function updateWarehouse(
  user: AuthenticatedUser,
  warehouseId: string,
  input: UpdateWarehouseInput
): Promise<{ id: string }> {
  const supabase = await createClient()
  const organizationId = user.organizationId

  const existing = await getWarehouseById(user, warehouseId)

  if (existing.isDefault && input.isActive === false) {
    throw new ConflictError(
      "El almacén predeterminado no se puede desactivar. Establece otro almacén como predeterminado primero."
    )
  }

  if (input.isDefault === true) {
    await clearDefaultWarehouse(organizationId, warehouseId)
  }

  const { error } = await supabase
    .from("warehouses")
    .update({
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      address: input.address ?? null,
      is_default: input.isDefault ?? existing.isDefault,
      is_active: input.isActive ?? existing.isActive,
    })
    .eq("id", warehouseId)
    .eq("organization_id", organizationId)

  if (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Ya existe un almacén con este código.")
    }

    throw error
  }

  return { id: warehouseId }
}
