import { Suspense } from "react"
import { Plus } from "lucide-react"

import { CustomersFilters } from "@/components/customers/customers-filters"
import { CustomersTable } from "@/components/customers/customers-table"
import { PageHeader } from "@/components/layout/page-header"
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
import { customerListFiltersSchema } from "@/lib/validations/customer.schema"
import { listCustomers } from "@/services/parties/customer.service"

type CustomersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function FiltersFallback() {
  return <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const user = await requirePermission("customers", "read")
  const canWrite = hasPermission(user, "customers", "write")
  const rawParams = await searchParams

  const parsedFilters = customerListFiltersSchema.safeParse({
    q: getParam(rawParams.q),
    status: getParam(rawParams.status) ?? "all",
  })

  const filters = parsedFilters.success
    ? {
        q: parsedFilters.data.q,
        status: parsedFilters.data.status ?? "all",
      }
    : { status: "all" as const }

  let customers: Awaited<ReturnType<typeof listCustomers>> = []
  let loadError: string | null = null

  try {
    customers = await listCustomers(user, filters)
  } catch {
    loadError = "Unable to load customers from the database."
  }

  const hasFilters = Boolean(filters.q || filters.status !== "all")

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage customer records for sales and history."
        actions={
          canWrite ? (
            <LinkButton href="/customers/new">
              <Plus data-icon="inline-start" />
              New customer
            </LinkButton>
          ) : undefined
        }
      />

      <Suspense fallback={<FiltersFallback />}>
        <CustomersFilters
          initialQuery={filters.q}
          initialStatus={filters.status}
        />
      </Suspense>

      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Unable to load customers</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      ) : customers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No customers found</CardTitle>
            <CardDescription>
              {hasFilters
                ? "Try adjusting your search or filters."
                : "Create your first customer to associate with sales."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <CustomersTable customers={customers} />
      )}
    </>
  )
}
