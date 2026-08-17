import { Suspense } from "react"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { SalesTable } from "@/components/sales/sales-table"
import { LinkButton } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { saleListFiltersSchema } from "@/lib/validations/sale.schema"
import { listSales } from "@/services/sales/sale.service"

type SalesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function FiltersFallback() {
  return <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
}

function SalesFilters({
  initialQuery = "",
  initialStatus = "all",
}: {
  initialQuery?: string
  initialStatus?: string
}) {
  return (
    <form
      action="/sales"
      method="get"
      className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label htmlFor="sale-search" className="mb-1 block text-sm font-medium">
          Search
        </label>
        <input
          id="sale-search"
          name="q"
          defaultValue={initialQuery}
          placeholder="Search by sale number"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="sm:w-48">
        <label htmlFor="sale-status" className="mb-1 block text-sm font-medium">
          Status
        </label>
        <select
          id="sale-status"
          name="status"
          defaultValue={initialStatus}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Apply
      </button>
    </form>
  )
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const user = await requirePermission("sales", "read")
  const canWrite = hasPermission(user, "sales", "write")
  const canComplete = hasPermission(user, "sales", "complete")
  const rawParams = await searchParams

  const parsedFilters = saleListFiltersSchema.safeParse({
    q: getParam(rawParams.q),
    status: getParam(rawParams.status) ?? "all",
  })

  const filters = parsedFilters.success
    ? {
        q: parsedFilters.data.q,
        status: parsedFilters.data.status ?? "all",
      }
    : { status: "all" as const }

  let sales: Awaited<ReturnType<typeof listSales>> = []
  let loadError: string | null = null

  try {
    sales = await listSales(user, filters)
  } catch {
    loadError = "Unable to load sales from the database."
  }

  const hasFilters = Boolean(filters.q || filters.status !== "all")

  return (
    <>
      <PageHeader
        title="Sales"
        description="Browse completed sales and open the point-of-sale flow."
        actions={
          canWrite && canComplete ? (
            <LinkButton href="/sales/new">
              <Plus data-icon="inline-start" />
              New sale
            </LinkButton>
          ) : undefined
        }
      />

      <Suspense fallback={<FiltersFallback />}>
        <SalesFilters initialQuery={filters.q} initialStatus={filters.status} />
      </Suspense>

      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Unable to load sales</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      ) : sales.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No sales found</CardTitle>
            <CardDescription>
              {hasFilters
                ? "Try adjusting your search or filters."
                : "Record your first sale to start tracking revenue and inventory impact."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <SalesTable sales={sales} />
      )}
    </>
  )
}
