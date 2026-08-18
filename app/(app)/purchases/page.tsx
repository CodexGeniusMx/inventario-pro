import { Suspense } from "react"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { PurchasesTable } from "@/components/purchases/purchases-table"
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
import { purchaseListFiltersSchema } from "@/lib/validations/purchase.schema"
import { listPurchaseOrders } from "@/services/purchasing/purchase.service"

type PurchasesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function FiltersFallback() {
  return <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
}

function PurchasesFilters({
  initialQuery = "",
  initialStatus = "all",
}: {
  initialQuery?: string
  initialStatus?: string
}) {
  return (
    <form
      action="/purchases"
      method="get"
      className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label htmlFor="purchase-search" className="mb-1 block text-sm font-medium">
          Buscar
        </label>
        <input
          id="purchase-search"
          name="q"
          defaultValue={initialQuery}
          placeholder="Buscar por número de OC o notas"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="sm:w-48">
        <label htmlFor="purchase-status" className="mb-1 block text-sm font-medium">
          Estado
        </label>
        <select
          id="purchase-status"
          name="status"
          defaultValue={initialStatus}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Todos</option>
          <option value="ordered">Ordenada</option>
          <option value="partially_received">Parcialmente recibida</option>
          <option value="received">Recibida</option>
          <option value="draft">Borrador</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>

      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Aplicar
      </button>
    </form>
  )
}

export default async function PurchasesPage({ searchParams }: PurchasesPageProps) {
  const user = await requirePermission("purchases", "read")
  const canWrite = user.role === "admin" && hasPermission(user, "purchases", "write")
  const rawParams = await searchParams

  const parsedFilters = purchaseListFiltersSchema.safeParse({
    q: getParam(rawParams.q),
    status: getParam(rawParams.status) ?? "all",
    supplierId: getParam(rawParams.supplierId),
  })

  const filters = parsedFilters.success
    ? {
        q: parsedFilters.data.q,
        status: parsedFilters.data.status ?? "all",
        supplierId: parsedFilters.data.supplierId || undefined,
      }
    : { status: "all" as const }

  let purchases: Awaited<ReturnType<typeof listPurchaseOrders>> = []
  let loadError: string | null = null

  try {
    purchases = await listPurchaseOrders(user, filters)
  } catch {
    loadError = "No se pudieron cargar las órdenes de compra desde la base de datos."
  }

  const hasFilters = Boolean(filters.q || filters.status !== "all")

  return (
    <>
      <PageHeader
        title="Compras"
        description="Órdenes de compra, progreso de recepción y abastecimiento vinculado a proveedores."
        actions={
          canWrite ? (
            <LinkButton href="/purchases/new">
              <Plus data-icon="inline-start" />
              Nueva compra
            </LinkButton>
          ) : undefined
        }
      />

      <Suspense fallback={<FiltersFallback />}>
        <PurchasesFilters
          initialQuery={filters.q}
          initialStatus={filters.status}
        />
      </Suspense>

      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>No se pudieron cargar las compras</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      ) : purchases.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No se encontraron órdenes de compra</CardTitle>
            <CardDescription>
              {hasFilters
                ? "Intenta ajustar tu búsqueda o filtros."
                : "Crea una orden de compra para pedir inventario a un proveedor."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <PurchasesTable purchases={purchases} />
      )}
    </>
  )
}
