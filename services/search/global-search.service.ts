import type { AuthenticatedUser } from "@/lib/auth/types"
import { hasPermission } from "@/lib/auth/permissions"
import type { GlobalSearchResult } from "@/lib/search/types"
import { createClient } from "@/lib/supabase/server"

export type { GlobalSearchResult, GlobalSearchResultType } from "@/lib/search/types"
export { globalSearchTypeLabel } from "@/lib/search/types"

export async function runGlobalSearch(
  user: AuthenticatedUser,
  query: string,
  limit = 8
): Promise<GlobalSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return []
  }

  const supabase = await createClient()
  const pattern = `%${trimmed}%`
  const results: GlobalSearchResult[] = []
  const seenProductIds = new Set<string>()

  const canViewProducts =
    hasPermission(user, "products", "view") ||
    hasPermission(user, "products", "read")
  const canViewCustomers =
    hasPermission(user, "customers", "view") ||
    hasPermission(user, "customers", "read")
  const canViewSuppliers =
    hasPermission(user, "suppliers", "view") ||
    hasPermission(user, "suppliers", "read")
  const canViewPurchases =
    hasPermission(user, "purchases", "view") ||
    hasPermission(user, "purchases", "read")
  const canViewSales =
    hasPermission(user, "sales", "view") ||
    hasPermission(user, "sales", "read")

  const perTypeLimit = Math.max(2, Math.ceil(limit / 2))

  if (canViewProducts) {
    const [{ data: variantsByCode }, { data: productsByName }] = await Promise.all([
      supabase
        .from("product_variants")
        .select("id, product_id, sku, barcode, products(name)")
        .eq("organization_id", user.organizationId)
        .is("deleted_at", null)
        .or(`sku.ilike.${pattern},barcode.ilike.${pattern}`)
        .limit(perTypeLimit),
      supabase
        .from("products")
        .select("id, name, product_variants(id, sku, barcode)")
        .eq("organization_id", user.organizationId)
        .is("deleted_at", null)
        .ilike("name", pattern)
        .limit(perTypeLimit),
    ])

    for (const row of variantsByCode ?? []) {
      if (seenProductIds.has(row.product_id)) continue
      seenProductIds.add(row.product_id)
      const product = row.products as { name: string } | null
      results.push({
        id: row.id,
        type: "product",
        title: product?.name ?? row.sku,
        subtitle: [row.sku, row.barcode].filter(Boolean).join(" · "),
        href: `/products/${row.product_id}`,
      })
    }

    for (const product of productsByName ?? []) {
      if (seenProductIds.has(product.id)) continue
      seenProductIds.add(product.id)
      const variant = (
        product.product_variants as Array<{ sku: string; barcode: string | null }> | null
      )?.[0]
      results.push({
        id: product.id,
        type: "product",
        title: product.name,
        subtitle: variant
          ? [variant.sku, variant.barcode].filter(Boolean).join(" · ")
          : "Producto",
        href: `/products/${product.id}`,
      })
    }
  }

  if (canViewCustomers) {
    const { data } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("organization_id", user.organizationId)
      .is("deleted_at", null)
      .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
      .limit(perTypeLimit)

    for (const row of data ?? []) {
      results.push({
        id: row.id,
        type: "customer",
        title: row.name,
        subtitle: [row.email, row.phone].filter(Boolean).join(" · ") || "Cliente",
        href: `/customers/${row.id}`,
      })
    }
  }

  if (canViewSuppliers) {
    const { data } = await supabase
      .from("suppliers")
      .select("id, name, email, phone")
      .eq("organization_id", user.organizationId)
      .is("deleted_at", null)
      .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
      .limit(perTypeLimit)

    for (const row of data ?? []) {
      results.push({
        id: row.id,
        type: "supplier",
        title: row.name,
        subtitle: [row.email, row.phone].filter(Boolean).join(" · ") || "Proveedor",
        href: `/suppliers/${row.id}`,
      })
    }
  }

  if (canViewPurchases) {
    const { data } = await supabase
      .from("purchase_orders")
      .select("id, document_number, suppliers(name)")
      .eq("organization_id", user.organizationId)
      .ilike("document_number", pattern)
      .limit(perTypeLimit)

    for (const row of data ?? []) {
      const supplier = row.suppliers as { name: string } | null
      results.push({
        id: row.id,
        type: "purchase",
        title: row.document_number,
        subtitle: supplier?.name ?? "Orden de compra",
        href: `/purchases/${row.id}`,
      })
    }
  }

  if (canViewSales) {
    const { data } = await supabase
      .from("sales")
      .select("id, document_number, customers(name)")
      .eq("organization_id", user.organizationId)
      .ilike("document_number", pattern)
      .limit(perTypeLimit)

    for (const row of data ?? []) {
      const customer = row.customers as { name: string } | null
      results.push({
        id: row.id,
        type: "sale",
        title: row.document_number,
        subtitle: customer?.name ?? "Venta",
        href: `/sales/${row.id}`,
      })
    }
  }

  return results.slice(0, limit)
}
