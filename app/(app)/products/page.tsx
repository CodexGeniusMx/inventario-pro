import { Suspense } from "react"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ProductsEmptyState } from "@/components/products/products-empty-state"
import { ProductsErrorState } from "@/components/products/products-error-state"
import { ProductsFilters } from "@/components/products/products-filters"
import { ProductsTable } from "@/components/products/products-table"
import { LinkButton } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { productListFiltersSchema } from "@/lib/validations/product.schema"
import { listCategories } from "@/services/catalog/category.service"
import { listProducts } from "@/services/catalog/product.service"

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function FiltersFallback() {
  return <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const user = await requirePermission("products", "read")
  const canWrite = hasPermission(user, "products", "write")
  const rawParams = await searchParams

  const parsedFilters = productListFiltersSchema.safeParse({
    q: getParam(rawParams.q),
    categoryId: getParam(rawParams.categoryId),
    status: getParam(rawParams.status) ?? "active",
  })

  const filters = parsedFilters.success
    ? {
        q: parsedFilters.data.q,
        categoryId: parsedFilters.data.categoryId || undefined,
        status: parsedFilters.data.status ?? "active",
      }
    : { status: "active" as const }

  let categories: Awaited<ReturnType<typeof listCategories>> = []
  let products: Awaited<ReturnType<typeof listProducts>> = []
  let loadError: string | null = null

  try {
    ;[categories, products] = await Promise.all([
      listCategories(user),
      listProducts(user, filters),
    ])
  } catch {
    loadError = "Unable to load products from the database."
  }

  const hasFilters = Boolean(
    filters.q || filters.categoryId || filters.status !== "active"
  )

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your product catalog, variants, SKU, and barcodes."
        actions={
          canWrite ? (
            <LinkButton href="/products/new">
              <Plus data-icon="inline-start" />
              New product
            </LinkButton>
          ) : undefined
        }
      />

      <Suspense fallback={<FiltersFallback />}>
        <ProductsFilters
          categories={categories}
          initialQuery={filters.q}
          initialCategoryId={filters.categoryId}
          initialStatus={filters.status}
        />
      </Suspense>

      {loadError ? (
        <ProductsErrorState message={loadError} />
      ) : products.length === 0 ? (
        <ProductsEmptyState canWrite={canWrite} hasFilters={hasFilters} />
      ) : (
        <ProductsTable products={products} />
      )}
    </>
  )
}
