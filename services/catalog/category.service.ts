import type { AuthenticatedUser } from "@/lib/auth/types"
import { ConflictError, ValidationError } from "@/lib/errors/app-error"
import { assertCanManageCategories } from "@/lib/auth/product-permissions"
import { createClient } from "@/lib/supabase/server"
import type { CategoryOption } from "@/types/catalog"

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export async function listCategories(
  user: AuthenticatedUser
): Promise<CategoryOption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("organization_id", user.organizationId)
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((category) => ({
    id: category.id,
    name: category.name,
  }))
}

export async function createCategory(
  user: AuthenticatedUser,
  name: string
): Promise<CategoryOption> {
  assertCanManageCategories(user)

  const trimmed = name.trim()
  if (!trimmed) {
    throw new ValidationError("El nombre de la categoría es obligatorio.")
  }

  const supabase = await createClient()
  const baseSlug = slugify(trimmed) || "categoria"

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`

    const { data, error } = await supabase
      .from("categories")
      .insert({
        organization_id: user.organizationId,
        name: trimmed,
        slug,
        is_active: true,
      })
      .select("id, name")
      .single()

    if (!error && data) {
      return data
    }

    if (error?.code !== "23505") {
      throw error
    }
  }

  throw new ConflictError("No se pudo crear la categoría. Inténtalo de nuevo.")
}

export async function renameCategory(
  user: AuthenticatedUser,
  categoryId: string,
  name: string
): Promise<CategoryOption> {
  assertCanManageCategories(user)

  const trimmed = name.trim()
  if (!trimmed) {
    throw new ValidationError("El nombre de la categoría es obligatorio.")
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("categories")
    .update({ name: trimmed })
    .eq("id", categoryId)
    .eq("organization_id", user.organizationId)
    .select("id, name")
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function archiveCategory(
  user: AuthenticatedUser,
  categoryId: string
): Promise<void> {
  assertCanManageCategories(user)

  const supabase = await createClient()

  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", user.organizationId)
    .eq("category_id", categoryId)
    .is("deleted_at", null)
    .eq("status", "active")

  if (countError) {
    throw countError
  }

  if ((count ?? 0) > 0) {
    throw new ConflictError(
      "No se puede archivar esta categoría porque tiene productos activos asignados."
    )
  }

  const { error } = await supabase
    .from("categories")
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .eq("organization_id", user.organizationId)

  if (error) {
    throw error
  }
}
