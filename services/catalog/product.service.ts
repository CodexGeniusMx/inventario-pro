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
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/app-error"
import { writeAuditLog } from "@/lib/audit/audit.service"
import { READ, WRITE } from "@/lib/db/read-models"
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

function mapVariantRow(
  variant: {
    id: string
    name: string
    sku: string
    barcode: string | null
    cost_price: number | null
    sale_price: number | null
    reorder_point: number
    is_active: boolean
  },
  includeCost: boolean
): ProductVariantRow {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    barcode: variant.barcode,
    costPrice: includeCost ? variant.cost_price : null,
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
      .from(READ.products)
      .select("id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .ilike("name", term),
    supabase
      .from(READ.productVariants)
      .select("product_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .ilike("sku", term),
    supabase
      .from(READ.productVariants)
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
  productsResult.data?.forEach((product) => {
    if (product.id) {
      ids.add(product.id)
    }
  })
  skuVariantsResult.data?.forEach((variant) => {
    if (variant.product_id) {
      ids.add(variant.product_id)
    }
  })
  barcodeVariantsResult.data?.forEach((variant) => {
    if (variant.product_id) {
      ids.add(variant.product_id)
    }
  })

  return Array.from(ids)
}

async function assertSkuAvailable(
  organizationId: string,
  sku: string,
  excludeVariantId?: string
): Promise<void> {
  const supabase = await createClient()

  let query = supabase
    .from(READ.productVariants)
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
    .from(READ.productVariants)
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
    .from(READ.products)
    .select(
      `
        id,
        name,
        status,
        unit_of_measure,
        base_cost_price,
        base_sale_price,
        updated_at,
        category_id
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

  const productRows = (data ?? []).filter(
    (product): product is (typeof data)[number] & { id: string; name: string; status: "active" | "archived" } =>
      Boolean(product.id && product.name && product.status)
  )
  const productRowIds = productRows.map((product) => product.id)
  const categoryIds = Array.from(
    new Set(
      productRows
        .map((product) => product.category_id)
        .filter((id): id is string => Boolean(id))
    )
  )
  const categoryNames = new Map<string, string>()

  if (categoryIds.length > 0) {
    const { data: categories, error: categoryError } = await supabase
      .from("categories")
      .select("id, name")
      .in("id", categoryIds)

    if (categoryError) {
      throw categoryError
    }

    for (const category of categories ?? []) {
      categoryNames.set(category.id, category.name)
    }
  }

  let variantsByProduct = new Map<
    string,
    Array<{
      id: string
      sku: string
      barcode: string | null
      cost_price: number | null
      sale_price: number | null
      is_active: boolean
      deleted_at: string | null
      created_at: string
    }>
  >()

  if (productRowIds.length > 0) {
    const { data: variantRows, error: variantError } = await supabase
      .from(READ.productVariants)
      .select(
        "id, product_id, sku, barcode, cost_price, sale_price, is_active, deleted_at, created_at"
      )
      .eq("organization_id", user.organizationId)
      .in("product_id", productRowIds)

    if (variantError) {
      throw variantError
    }

    for (const variant of variantRows ?? []) {
      if (!variant.product_id || !variant.id) {
        continue
      }

      const bucket = variantsByProduct.get(variant.product_id) ?? []
      bucket.push({
        id: variant.id,
        sku: variant.sku ?? "—",
        barcode: variant.barcode,
        cost_price: variant.cost_price,
        sale_price: variant.sale_price,
        is_active: variant.is_active ?? true,
        deleted_at: variant.deleted_at,
        created_at: variant.created_at ?? new Date(0).toISOString(),
      })
      variantsByProduct.set(variant.product_id, bucket)
    }
  }

  return productRows.map((product) => {
    const variants = variantsByProduct.get(product.id) ?? []
    const activeVariants = variants.filter((variant) => !variant.deleted_at)
    const lead = primaryVariant(variants)
    const salePrice = resolveVariantSalePrice(
      lead?.sale_price ?? null,
      product.base_sale_price ?? 0
    )

    const item: ProductListItem = {
      id: product.id,
      name: product.name,
      status: product.status,
      categoryName: product.category_id
        ? categoryNames.get(product.category_id) ?? null
        : null,
      variantCount: activeVariants.length,
      primarySku: lead?.sku ?? null,
      primaryBarcode: lead?.barcode ?? null,
      salePrice,
      unitOfMeasure: product.unit_of_measure ?? "",
      updatedAt: product.updated_at ?? new Date(0).toISOString(),
    }

    if (includeCost) {
      item.costPrice = resolveVariantCostPrice(
        lead?.cost_price ?? null,
        product.base_cost_price ?? 0
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
    .from(READ.products)
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
        updated_at
      `
    )
    .eq("id", productId)
    .eq("organization_id", user.organizationId)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data?.id || !data.name || !data.status) {
    throw new NotFoundError("Producto no encontrado.")
  }

  let categoryName: string | null = null

  if (data.category_id) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("name")
      .eq("id", data.category_id)
      .maybeSingle()

    if (categoryError) {
      throw categoryError
    }

    categoryName = category?.name ?? null
  }

  const { data: variantRows, error: variantError } = await supabase
    .from(READ.productVariants)
    .select(
      "id, name, sku, barcode, cost_price, sale_price, reorder_point, is_active, deleted_at, created_at"
    )
    .eq("product_id", productId)
    .eq("organization_id", user.organizationId)

  if (variantError) {
    throw variantError
  }

  const variants = (variantRows ?? [])
    .filter((variant) => variant.id && variant.name && !variant.deleted_at)
    .sort(
      (left, right) =>
        new Date(left.created_at ?? 0).getTime() -
        new Date(right.created_at ?? 0).getTime()
    )
    .map((variant) =>
      mapVariantRow(
        {
          id: variant.id!,
          name: variant.name!,
          sku: variant.sku ?? "—",
          barcode: variant.barcode,
          cost_price: variant.cost_price,
          sale_price: variant.sale_price,
          reorder_point: variant.reorder_point ?? 0,
          is_active: variant.is_active ?? true,
        },
        includeCost
      )
    )

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    status: data.status,
    unitOfMeasure: data.unit_of_measure ?? "",
    baseCostPrice: includeCost ? data.base_cost_price ?? undefined : undefined,
    baseSalePrice: data.base_sale_price ?? 0,
    canViewCost: includeCost,
    categoryId: data.category_id,
    categoryName,
    createdAt: data.created_at ?? new Date(0).toISOString(),
    updatedAt: data.updated_at ?? new Date(0).toISOString(),
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
    .from(WRITE.products)
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

  const { error: variantError } = await supabase.from(WRITE.productVariants).insert({
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
    await supabase.from(WRITE.products).delete().eq("id", product.id)

    if (isUniqueViolation(variantError)) {
      const message = variantError.message.toLowerCase().includes("barcode")
        ? "Ya existe un producto con este código de barras."
        : "Ya existe un producto con este SKU."

      throw new ConflictError(message)
    }

    throw variantError
  }

  await writeAuditLog({
    organizationId,
    action: "product.create",
    entityType: "product",
    entityId: product.id,
    newValues: {
      name: input.name.trim(),
      sku: input.variant.sku.trim(),
      base_sale_price: input.baseSalePrice,
    },
    source: "ui",
  })

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
    .from(WRITE.products)
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
    .from(WRITE.productVariants)
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

  await writeAuditLog({
    organizationId,
    action: "product.update",
    entityType: "product",
    entityId: productId,
    oldValues: {
      name: existing.name,
      base_sale_price: existing.baseSalePrice,
      status: existing.status,
    },
    newValues: {
      name: input.name.trim(),
      base_sale_price: input.baseSalePrice,
    },
    source: "ui",
  })

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
    .from(WRITE.products)
    .update({
      status: "archived",
    })
    .eq("id", productId)
    .eq("organization_id", organizationId)

  if (productError) {
    throw productError
  }

  const { error: variantError } = await supabase
    .from(WRITE.productVariants)
    .update({
      is_active: false,
    })
    .eq("product_id", productId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)

  if (variantError) {
    throw variantError
  }

  await writeAuditLog({
    organizationId,
    action: "product.archive",
    entityType: "product",
    entityId: productId,
    oldValues: { status: existing.status },
    newValues: { status: "archived" },
    source: "ui",
  })
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
    .from(WRITE.products)
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
    .from(WRITE.productVariants)
    .update({
      is_active: true,
      deleted_at: null,
    })
    .eq("product_id", productId)
    .eq("organization_id", organizationId)

  if (variantError) {
    throw variantError
  }

  await writeAuditLog({
    organizationId,
    action: "product.reactivate",
    entityType: "product",
    entityId: productId,
    oldValues: { status: existing.status },
    newValues: { status: "active" },
    source: "ui",
  })
}
