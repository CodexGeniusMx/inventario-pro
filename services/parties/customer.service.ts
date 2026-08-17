import type { PostgrestError } from "@supabase/supabase-js"

import type { AuthenticatedUser } from "@/lib/auth/types"
import { ConflictError, NotFoundError } from "@/lib/errors/app-error"
import { createClient } from "@/lib/supabase/server"
import type {
  CreateCustomerInput,
  CustomerDetail,
  CustomerListFilters,
  CustomerOption,
  CustomerRow,
  UpdateCustomerInput,
} from "@/types/customers"

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === "23505"
}

function mapCustomer(row: {
  id: string
  name: string
  email: string | null
  phone: string | null
  tax_id: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}): CustomerRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    taxId: row.tax_id,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listCustomers(
  user: AuthenticatedUser,
  filters: CustomerListFilters = {}
): Promise<CustomerRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("customers")
    .select(
      "id, name, email, phone, tax_id, notes, is_active, created_at, updated_at"
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
      `name.ilike.${term},email.ilike.${term},phone.ilike.${term},tax_id.ilike.${term}`
    )
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map(mapCustomer)
}

export async function listCustomerOptions(
  user: AuthenticatedUser
): Promise<CustomerOption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("customers")
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

export async function getCustomerById(
  user: AuthenticatedUser,
  customerId: string
): Promise<CustomerDetail> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, name, email, phone, tax_id, notes, is_active, created_at, updated_at"
    )
    .eq("id", customerId)
    .eq("organization_id", user.organizationId)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Customer not found.")
  }

  return mapCustomer(data)
}

export async function createCustomer(
  user: AuthenticatedUser,
  input: CreateCustomerInput
): Promise<{ id: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("customers")
    .insert({
      organization_id: user.organizationId,
      name: input.name.trim(),
      email: input.email ?? null,
      phone: input.phone ?? null,
      tax_id: input.taxId ?? null,
      notes: input.notes ?? null,
      is_active: input.isActive ?? true,
    })
    .select("id")
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("A customer with this name already exists.")
    }

    throw error
  }

  return { id: data.id }
}

export async function updateCustomer(
  user: AuthenticatedUser,
  customerId: string,
  input: UpdateCustomerInput
): Promise<{ id: string }> {
  const supabase = await createClient()

  await getCustomerById(user, customerId)

  const { error } = await supabase
    .from("customers")
    .update({
      name: input.name.trim(),
      email: input.email ?? null,
      phone: input.phone ?? null,
      tax_id: input.taxId ?? null,
      notes: input.notes ?? null,
      is_active: input.isActive ?? true,
    })
    .eq("id", customerId)
    .eq("organization_id", user.organizationId)

  if (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("A customer with this name already exists.")
    }

    throw error
  }

  return { id: customerId }
}
