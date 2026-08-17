import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import { ReturnsTable } from "@/components/returns/returns-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requirePermission } from "@/lib/auth/session"
import { returnListFiltersSchema } from "@/lib/validations/return.schema"
import {
  listReturnableSales,
  listReturns,
} from "@/services/returns/return.service"

type ReturnsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function ReturnsPage({ searchParams }: ReturnsPageProps) {
  const user = await requirePermission("returns", "read")
  const rawParams = await searchParams

  const parsedFilters = returnListFiltersSchema.safeParse({
    q: getParam(rawParams.q),
  })

  const filters = parsedFilters.success
    ? { q: parsedFilters.data.q }
    : {}

  let returns: Awaited<ReturnType<typeof listReturns>> = []
  let returnableSales: Awaited<ReturnType<typeof listReturnableSales>> = []
  let loadError: string | null = null

  try {
    ;[returns, returnableSales] = await Promise.all([
      listReturns(user, filters),
      listReturnableSales(user),
    ])
  } catch {
    loadError = "Unable to load returns from the database."
  }

  const hasFilters = Boolean(filters.q)

  return (
    <>
      <PageHeader
        title="Returns"
        description="Customer sale returns with inventory restock and audit trail."
      />

      <form
        action="/returns"
        method="get"
        className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="return-search" className="mb-1 block text-sm font-medium">
            Search
          </label>
          <input
            id="return-search"
            name="q"
            defaultValue={filters.q}
            placeholder="Search by return number"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Apply
        </button>
      </form>

      {returnableSales.length > 0 ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Sales with returnable items</CardTitle>
            <CardDescription>
              Start a return from a completed sale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {returnableSales.slice(0, 8).map((sale) => (
              <p key={sale.id}>
                <Link
                  href={`/sales/${sale.id}/return`}
                  className="font-medium text-primary hover:underline"
                >
                  {sale.documentNumber}
                </Link>
                <span className="text-muted-foreground">
                  {" "}
                  · {sale.customerName ?? "Walk-in"} · {sale.returnableLineCount}{" "}
                  line(s) returnable
                </span>
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Unable to load returns</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      ) : returns.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No returns found</CardTitle>
            <CardDescription>
              {hasFilters
                ? "Try adjusting your search."
                : "Process a return from a completed sale to see it here."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ReturnsTable returns={returns} />
      )}
    </>
  )
}
