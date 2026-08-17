import type { CategoryOption } from "@/types/catalog"
import type { AuthenticatedUser } from "@/lib/auth/types"
import { createClient } from "@/lib/supabase/server"

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
