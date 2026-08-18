import { Suspense } from "react"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { SuppliersFilters } from "@/components/suppliers/suppliers-filters"
import { SuppliersTable } from "@/components/suppliers/suppliers-table"
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
import { supplierListFiltersSchema } from "@/lib/validations/supplier.schema"
import { listSuppliers } from "@/services/parties/supplier.service"

type SuppliersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function FiltersFallback() {
  return <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
}

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const user = await requirePermission("suppliers", "read")
  const canWrite = user.role === "admin" && hasPermission(user, "suppliers", "write")
  const rawParams = await searchParams

  const parsedFilters = supplierListFiltersSchema.safeParse({
    q: getParam(rawParams.q),
    status: getParam(rawParams.status) ?? "all",
  })

  const filters = parsedFilters.success
    ? {
        q: parsedFilters.data.q,
        status: parsedFilters.data.status ?? "all",
      }
    : { status: "all" as const }

  let suppliers: Awaited<ReturnType<typeof listSuppliers>> = []
  let loadError: string | null = null

  try {
    suppliers = await listSuppliers(user, filters)
  } catch {
    loadError = "No se pudieron cargar los proveedores desde la base de datos."
  }

  const hasFilters = Boolean(filters.q || filters.status !== "all")

  return (
    <>
      <PageHeader
        title="Proveedores"
        description="Administra contactos de proveedores, condiciones de pago y estado."
        actions={
          canWrite ? (
            <LinkButton href="/suppliers/new">
              <Plus data-icon="inline-start" />
              Nuevo proveedor
            </LinkButton>
          ) : undefined
        }
      />

      <Suspense fallback={<FiltersFallback />}>
        <SuppliersFilters
          initialQuery={filters.q}
          initialStatus={filters.status}
        />
      </Suspense>

      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>No se pudieron cargar los proveedores</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      ) : suppliers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No se encontraron proveedores</CardTitle>
            <CardDescription>
              {hasFilters
                ? "Intenta ajustar tu búsqueda o filtros."
                : "Crea tu primer proveedor para comenzar a comprar inventario."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <SuppliersTable suppliers={suppliers} />
      )}
    </>
  )
}
