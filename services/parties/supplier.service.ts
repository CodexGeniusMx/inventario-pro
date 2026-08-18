import type { PostgrestError } from "@supabase/supabase-js"

import type { AuthenticatedUser } from "@/lib/auth/types"
import { ConflictError, NotFoundError } from "@/lib/errors/app-error"
import { createClient } from "@/lib/supabase/server"
import type {
  CreateSupplierInput,
  SupplierDetail,
  SupplierListFilters,
  SupplierOption,
  SupplierRow,
  UpdateSupplierInput,
} from "@/types/suppliers"

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === "23505"
}

function mapSupplier(row: {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  tax_id: string | null
  payment_terms: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}): SupplierRow {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    taxId: row.tax_id,
    paymentTerms: row.payment_terms,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listSuppliers(
  user: AuthenticatedUser,
  filters: SupplierListFilters = {}
): Promise<SupplierRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("suppliers")
    .select(
      "id, name, contact_name, email, phone, tax_id, payment_terms, notes, is_active, created_at, updated_at"
    )
    .eq("organization_id", user.organizationId)
    .is("deleted_at", null)
    .order("name", { ascending: true })

  if (filters.status === "active") {
    query = query.eq("is_active", true)
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false)
  }

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`
    query = query.or(
      `name.ilike.${term},contact_name.ilike.${term},email.ilike.${term},phone.ilike.${term},tax_id.ilike.${term}`
    )
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map(mapSupplier)
}

export async function listSupplierOptions(
  user: AuthenticatedUser
): Promise<SupplierOption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, is_active")
    .eq("organization_id", user.organizationId)
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    isActive: row.is_active,
  }))
}

export async function getSupplierById(
  user: AuthenticatedUser,
  supplierId: string
): Promise<SupplierDetail> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("suppliers")
    .select(
      "id, name, contact_name, email, phone, tax_id, payment_terms, notes, is_active, created_at, updated_at"
    )
    .eq("id", supplierId)
    .eq("organization_id", user.organizationId)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Proveedor no encontrado.")
  }

  return mapSupplier(data)
}

export async function createSupplier(
  user: AuthenticatedUser,
  input: CreateSupplierInput
): Promise<{ id: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      organization_id: user.organizationId,
      name: input.name.trim(),
      contact_name: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      tax_id: input.taxId ?? null,
      payment_terms: input.paymentTerms ?? null,
      notes: input.notes ?? null,
      is_active: input.isActive ?? true,
    })
    .select("id")
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Ya existe un proveedor con este nombre.")
    }

    throw error
  }

  return { id: data.id }
}

export async function updateSupplier(
  user: AuthenticatedUser,
  supplierId: string,
  input: UpdateSupplierInput
): Promise<{ id: string }> {
  const supabase = await createClient()

  await getSupplierById(user, supplierId)

  const { error } = await supabase
    .from("suppliers")
    .update({
      name: input.name.trim(),
      contact_name: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      tax_id: input.taxId ?? null,
      payment_terms: input.paymentTerms ?? null,
      notes: input.notes ?? null,
      is_active: input.isActive ?? true,
    })
    .eq("id", supplierId)
    .eq("organization_id", user.organizationId)

  if (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Ya existe un proveedor con este nombre.")
    }

    throw error
  }

  return { id: supplierId }
}
