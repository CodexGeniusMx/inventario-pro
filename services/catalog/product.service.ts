import type { PostgrestError } from "@supabase/supabase-js"

import {
  assertCanArchiveProducts,
  assertCanCreateProducts,
  assertCanEditProducts,
  assertCanViewProductCosts,
  assertCanViewProducts,
  canViewProductCosts,
} from "@/lib/auth/product-permissions"
import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  resolveVariantCostPrice,
  resolveVariantSalePrice,
} from "@/lib/catalog/product-pricing"
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors/app-error"
import { createClient } from "@/lib/supabase/server"
import type {
  CreateProductInput,
  ProductDetail,
  ProductListFilters,
  ProductListItem,
  ProductVariantRow,
  UpdateProductInput,
} from "@/types/catalog"

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === "23505"
}

function mapVariantRow(variant: {
  id: string
  name: string
  sku: string
  barcode: string | null
  cost_price: number | null
  sale_price: number | null
  reorder_point: number
  is_active: boolean
}): ProductVariantRow {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    barcode: variant.barcode,
    costPrice: variant.cost_price,
    salePrice: variant.sale_price,
    reorderPoint: variant.reorder_point,
    isActive: variant.is_active,
  }
}

function primaryVariant(
  variants: Array<{
    id: string
    sku: string
    barcode: string | null
    cost_price: number | null
    sale_price: number | null
    is_active: boolean
    deleted_at: string | null
    created_at: string
  }>
) {
  const active = variants.filter((variant) => !variant.deleted_at && variant.is_active)
  const pool = active.length > 0 ? active : variants.filter((variant) => !variant.deleted_at)
  return pool.sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  )[0]
}

async function findProductIdsForSearch(
  organizationId: string,
  query: string
): Promise<string[]> {
  const supabase = await createClient()
  const term = `%${query.trim()}%`

  const [productsResult, skuVariantsResult, barcodeVariantsResult] =
    await Promise.all([
    supabase
      .from("products")
      .select("id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .ilike("name", term),
    supabase
      .from("product_variants")
      .select("product_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .ilike("sku", term),
    supabase
      .from("product_variants")
      .select("product_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .not("barcode", "is", null)
      .ilike("barcode", term),
  ])

  if (productsResult.error) {
    throw productsResult.error
  }

  if (skuVariantsResult.error) {
    throw skuVariantsResult.error
  }

  if (barcodeVariantsResult.error) {
    throw barcodeVariantsResult.error
  }

  const ids = new Set<string>()
  productsResult.data?.forEach((product) => ids.add(product.id))
  skuVariantsResult.data?.forEach((variant) => ids.add(variant.product_id))
  barcodeVariantsResult.data?.forEach((variant) => ids.add(variant.product_id))

  return Array.from(ids)
}

async function assertSkuAvailable(
  organizationId: string,
  sku: string,
  excludeVariantId?: string
): Promise<void> {
  const supabase = await createClient()

  let query = supabase
    .from("product_variants")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("sku", sku.trim())
    .is("deleted_at", null)

  if (excludeVariantId) {
    query = query.neq("id", excludeVariantId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw error
  }

  if (data) {
    throw new ConflictError("Ya existe un producto con este SKU.")
  }
}

async function assertBarcodeAvailable(
  organizationId: string,
  barcode: string,
  excludeVariantId?: string
): Promise<void> {
  const supabase = await createClient()

  let query = supabase
    .from("product_variants")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("barcode", barcode.trim())
    .is("deleted_at", null)

  if (excludeVariantId) {
    query = query.neq("id", excludeVariantId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw error
  }

  if (data) {
    throw new ConflictError("Ya existe un producto con este código de barras.")
  }
}

export async function listProducts(
  user: AuthenticatedUser,
  filters: ProductListFilters = {}
): Promise<ProductListItem[]> {
  assertCanViewProducts(user)

  const supabase = await createClient()
  const status = filters.status ?? "active"
  const includeCost = canViewProductCosts(user)

  let productIds: string[] | null = null

  if (filters.q?.trim()) {
    productIds = await findProductIdsForSearch(user.organizationId, filters.q)

    if (productIds.length === 0) {
      return []
    }
  }

  let query = supabase
    .from("products")
    .select(
      `
        id,
        name,
        status,
        unit_of_measure,
        base_cost_price,
        base_sale_price,
        updated_at,
        categories ( name ),
        product_variants (
          id,
          sku,
          barcode,
          cost_price,
          sale_price,
          is_active,
          deleted_at,
          created_at
        )
      `
    )
    .eq("organization_id", user.organizationId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })

  if (productIds) {
    query = query.in("id", productIds)
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId)
  }

  if (status === "active") {
    query = query.eq("status", "active")
  } else if (status === "archived") {
    query = query.eq("status", "archived")
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map((product) => {
    const variants = product.product_variants ?? []
    const activeVariants = variants.filter((variant) => !variant.deleted_at)
    const lead = primaryVariant(variants)
    const salePrice = resolveVariantSalePrice(
      lead?.sale_price ?? null,
      product.base_sale_price
    )

    const item: ProductListItem = {
      id: product.id,
      name: product.name,
      status: product.status,
      categoryName: product.categories?.name ?? null,
      variantCount: activeVariants.length,
      primarySku: lead?.sku ?? null,
      primaryBarcode: lead?.barcode ?? null,
      salePrice,
      unitOfMeasure: product.unit_of_measure,
      updatedAt: product.updated_at,
    }

    if (includeCost) {
      item.costPrice = resolveVariantCostPrice(
        lead?.cost_price ?? null,
        product.base_cost_price
      )
    }

    return item
  })
}

export async function getProductById(
  user: AuthenticatedUser,
  productId: string
): Promise<ProductDetail> {
  assertCanViewProducts(user)

  const supabase = await createClient()
  const includeCost = canViewProductCosts(user)

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        description,
        status,
        unit_of_measure,
        base_cost_price,
        base_sale_price,
        category_id,
        created_at,
        updated_at,
        categories ( name ),
        product_variants (
          id,
          name,
          sku,
          barcode,
          cost_price,
          sale_price,
          reorder_point,
          is_active,
          deleted_at,
          created_at
        )
      `
    )
    .eq("id", productId)
    .eq("organization_id", user.organizationId)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Producto no encontrado.")
  }

  const variants = (data.product_variants ?? [])
    .filter((variant) => !variant.deleted_at)
    .sort(
      (left, right) =>
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    )
    .map(mapVariantRow)

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    status: data.status,
    unitOfMeasure: data.unit_of_measure,
    baseCostPrice: includeCost ? data.base_cost_price : undefined,
    baseSalePrice: data.base_sale_price,
    canViewCost: includeCost,
    categoryId: data.category_id,
    categoryName: data.categories?.name ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    variants,
  }
}

export async function createProduct(
  user: AuthenticatedUser,
  input: CreateProductInput
): Promise<{ id: string }> {
  assertCanCreateProducts(user)

  if (!canViewProductCosts(user) && input.baseCostPrice > 0) {
    throw new ForbiddenError("No tienes permiso para establecer costos de compra.")
  }

  const supabase = await createClient()
  const organizationId = user.organizationId

  await assertSkuAvailable(organizationId, input.variant.sku)

  if (input.variant.barcode) {
    await assertBarcodeAvailable(organizationId, input.variant.barcode)
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      description: input.description ?? null,
      category_id: input.categoryId ?? null,
      unit_of_measure: input.unitOfMeasure.trim(),
      base_cost_price: input.baseCostPrice,
      base_sale_price: input.baseSalePrice,
      status: "active",
    })
    .select("id")
    .single()

  if (productError) {
    if (isUniqueViolation(productError)) {
      throw new ConflictError("No se pudo crear el producto por un valor duplicado.")
    }

    throw productError
  }

  const { error: variantError } = await supabase.from("product_variants").insert({
    organization_id: organizationId,
    product_id: product.id,
    name: input.variant.name.trim(),
    sku: input.variant.sku.trim(),
    barcode: input.variant.barcode ?? null,
    cost_price: input.variant.costPrice ?? null,
    sale_price: input.variant.salePrice ?? null,
    reorder_point: input.variant.reorderPoint,
    is_active: true,
  })

  if (variantError) {
    await supabase.from("products").delete().eq("id", product.id)

    if (isUniqueViolation(variantError)) {
      const message = variantError.message.toLowerCase().includes("barcode")
        ? "Ya existe un producto con este código de barras."
        : "Ya existe un producto con este SKU."

      throw new ConflictError(message)
    }

    throw variantError
  }

  return { id: product.id }
}

export async function updateProduct(
  user: AuthenticatedUser,
  productId: string,
  input: UpdateProductInput
): Promise<{ id: string }> {
  assertCanEditProducts(user)

  const supabase = await createClient()
  const organizationId = user.organizationId

  const existing = await getProductById(user, productId)

  if (existing.status === "archived") {
    throw new ConflictError("Los productos archivados no se pueden editar.")
  }

  let baseCostPrice = input.baseCostPrice
  let variantCostPrice = input.variant.costPrice ?? null

  if (!canViewProductCosts(user)) {
    const { data: rawProduct, error: rawProductError } = await supabase
      .from("products")
      .select("base_cost_price")
      .eq("id", productId)
      .eq("organization_id", organizationId)
      .single()

    if (rawProductError) {
      throw rawProductError
    }

    baseCostPrice = rawProduct.base_cost_price

    const variantId = input.variant.id ?? existing.variants[0]?.id
    if (variantId) {
      const { data: rawVariant, error: rawVariantError } = await supabase
        .from("product_variants")
        .select("cost_price")
        .eq("id", variantId)
        .single()

      if (rawVariantError) {
        throw rawVariantError
      }

      variantCostPrice = rawVariant.cost_price
    }
  }

  const excludeVariantId = input.variant.id ?? existing.variants[0]?.id

  await assertSkuAvailable(organizationId, input.variant.sku, excludeVariantId)

  if (input.variant.barcode) {
    await assertBarcodeAvailable(
      organizationId,
      input.variant.barcode,
      excludeVariantId
    )
  }

  const { error: productError } = await supabase
    .from("products")
    .update({
      name: input.name.trim(),
      description: input.description ?? null,
      category_id: input.categoryId ?? null,
      unit_of_measure: input.unitOfMeasure.trim(),
      base_cost_price: baseCostPrice,
      base_sale_price: input.baseSalePrice,
    })
    .eq("id", productId)
    .eq("organization_id", organizationId)

  if (productError) {
    throw productError
  }

  const variantId = input.variant.id ?? existing.variants[0]?.id

  if (!variantId) {
    throw new NotFoundError("Variante de producto no encontrada.")
  }

  const { error: variantError } = await supabase
    .from("product_variants")
    .update({
      name: input.variant.name.trim(),
      sku: input.variant.sku.trim(),
      barcode: input.variant.barcode ?? null,
      cost_price: variantCostPrice,
      sale_price: input.variant.salePrice ?? null,
      reorder_point: input.variant.reorderPoint,
    })
    .eq("id", variantId)
    .eq("product_id", productId)
    .eq("organization_id", organizationId)

  if (variantError) {
    if (isUniqueViolation(variantError)) {
      const message = variantError.message.toLowerCase().includes("barcode")
        ? "Ya existe un producto con este código de barras."
        : "Ya existe un producto con este SKU."

      throw new ConflictError(message)
    }

    throw variantError
  }

  return { id: productId }
}

export async function archiveProduct(
  user: AuthenticatedUser,
  productId: string
): Promise<void> {
  assertCanArchiveProducts(user)

  const supabase = await createClient()
  const organizationId = user.organizationId

  const existing = await getProductById(user, productId)

  if (existing.status === "archived") {
    return
  }

  const { error: productError } = await supabase
    .from("products")
    .update({
      status: "archived",
    })
    .eq("id", productId)
    .eq("organization_id", organizationId)

  if (productError) {
    throw productError
  }

  const { error: variantError } = await supabase
    .from("product_variants")
    .update({
      is_active: false,
    })
    .eq("product_id", productId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)

  if (variantError) {
    throw variantError
  }
}

export async function reactivateProduct(
  user: AuthenticatedUser,
  productId: string
): Promise<void> {
  assertCanArchiveProducts(user)

  const supabase = await createClient()
  const organizationId = user.organizationId

  const existing = await getProductById(user, productId)

  if (existing.status === "active") {
    return
  }

  const { error: productError } = await supabase
    .from("products")
    .update({
      status: "active",
      deleted_at: null,
    })
    .eq("id", productId)
    .eq("organization_id", organizationId)

  if (productError) {
    throw productError
  }

  const { error: variantError } = await supabase
    .from("product_variants")
    .update({
      is_active: true,
      deleted_at: null,
    })
    .eq("product_id", productId)
    .eq("organization_id", organizationId)

  if (variantError) {
    throw variantError
  }
}
