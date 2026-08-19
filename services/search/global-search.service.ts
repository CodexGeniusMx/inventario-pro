import type { AuthenticatedUser } from "@/lib/auth/types"
import { hasPermission } from "@/lib/auth/permissions"
import { READ } from "@/lib/db/read-models"
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
        .from(READ.productVariants)
        .select("id, product_id, sku, barcode")
        .eq("organization_id", user.organizationId)
        .is("deleted_at", null)
        .or(`sku.ilike.${pattern},barcode.ilike.${pattern}`)
        .limit(perTypeLimit),
      supabase
        .from(READ.products)
        .select("id, name")
        .eq("organization_id", user.organizationId)
        .is("deleted_at", null)
        .eq("status", "active")
        .ilike("name", pattern)
        .limit(perTypeLimit),
    ])

    const productIdsForVariants = Array.from(
      new Set((variantsByCode ?? []).map((row) => row.product_id))
    )
    const productNames = new Map<string, string>()

    for (const product of productsByName ?? []) {
      if (product.id && product.name) {
        productNames.set(product.id, product.name)
      }
    }

    if (productIdsForVariants.length > 0) {
      const { data: linkedProducts } = await supabase
        .from(READ.products)
        .select("id, name")
        .in("id", productIdsForVariants)

      for (const product of linkedProducts ?? []) {
        if (product.id && product.name) {
          productNames.set(product.id, product.name)
        }
      }
    }

    for (const row of variantsByCode ?? []) {
      if (!row.product_id || !row.id) {
        continue
      }

      if (seenProductIds.has(row.product_id)) continue
      seenProductIds.add(row.product_id)
      results.push({
        id: row.id,
        type: "product",
        title: productNames.get(row.product_id) ?? row.sku ?? "Producto",
        subtitle: [row.sku, row.barcode].filter(Boolean).join(" · "),
        href: `/products/${row.product_id}`,
      })
    }

    for (const product of productsByName ?? []) {
      if (!product.id || !product.name) {
        continue
      }
      seenProductIds.add(product.id)
      results.push({
        id: product.id,
        type: "product",
        title: product.name,
        subtitle: "Producto",
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
      .from(READ.purchaseOrders)
      .select("id, document_number, supplier_id")
      .eq("organization_id", user.organizationId)
      .ilike("document_number", pattern)
      .limit(perTypeLimit)

    const supplierIds = Array.from(
      new Set((data ?? []).map((row) => row.supplier_id).filter((id): id is string => Boolean(id)))
    )
    const supplierNames = new Map<string, string>()

    if (supplierIds.length > 0) {
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id, name")
        .in("id", supplierIds)

      for (const supplier of suppliers ?? []) {
        supplierNames.set(supplier.id, supplier.name)
      }
    }

    for (const row of data ?? []) {
      if (!row.id || !row.document_number) {
        continue
      }

      results.push({
        id: row.id,
        type: "purchase",
        title: row.document_number,
        subtitle: row.supplier_id
          ? supplierNames.get(row.supplier_id) ?? "Orden de compra"
          : "Orden de compra",
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
