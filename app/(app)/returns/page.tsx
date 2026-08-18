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
    loadError = "No se pudieron cargar las devoluciones desde la base de datos."
  }

  const hasFilters = Boolean(filters.q)

  return (
    <>
      <PageHeader
        title="Devoluciones"
        description="Devoluciones de ventas con reintegración de inventario y registro de auditoría."
      />

      <form
        action="/returns"
        method="get"
        className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="return-search" className="mb-1 block text-sm font-medium">
            Buscar
          </label>
          <input
            id="return-search"
            name="q"
            defaultValue={filters.q}
            placeholder="Buscar por número de devolución"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Aplicar
        </button>
      </form>

      {returnableSales.length > 0 ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Ventas con artículos por devolver</CardTitle>
            <CardDescription>
              Inicia una devolución desde una venta completada.
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
                  · {sale.customerName ?? "Cliente ocasional"} · {sale.returnableLineCount}{" "}
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
            <CardTitle>No se pudieron cargar las devoluciones</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      ) : returns.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No se encontraron devoluciones</CardTitle>
            <CardDescription>
              {hasFilters
                ? "Intenta ajustar tu búsqueda."
                : "Procesa una devolución de una venta completada para verla aquí."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ReturnsTable returns={returns} />
      )}
    </>
  )
}
