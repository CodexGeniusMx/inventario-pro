import type { SupabaseClient } from "@supabase/supabase-js"

import { READ } from "@/lib/db/read-models"

export type VariantDisplayMeta = {
  name: string
  sku: string
  productName: string
}

export async function fetchVariantDisplayMeta(
  supabase: SupabaseClient,
  variantIds: string[]
): Promise<Map<string, VariantDisplayMeta>> {
  const uniqueIds = Array.from(new Set(variantIds.filter(Boolean)))
  const meta = new Map<string, VariantDisplayMeta>()

  if (uniqueIds.length === 0) {
    return meta
  }

  const { data: variants, error: variantError } = await supabase
    .from(READ.productVariants)
    .select("id, name, sku, product_id")
    .in("id", uniqueIds)

  if (variantError) {
    throw variantError
  }

  const productIds = Array.from(new Set((variants ?? []).map((variant) => variant.product_id)))
  const productNames = new Map<string, string>()

  if (productIds.length > 0) {
    const { data: products, error: productError } = await supabase
      .from(READ.products)
      .select("id, name")
      .in("id", productIds)

    if (productError) {
      throw productError
    }

    for (const product of products ?? []) {
      productNames.set(product.id, product.name)
    }
  }

  for (const variant of variants ?? []) {
    meta.set(variant.id, {
      name: variant.name,
      sku: variant.sku,
      productName: productNames.get(variant.product_id) ?? "Producto desconocido",
    })
  }

  return meta
}
