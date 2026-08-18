import { notFound, redirect } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { ReturnForm } from "@/components/returns/return-form"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { NotFoundError, ValidationError } from "@/lib/errors/app-error"
import { getSaleReturnContext } from "@/services/returns/return.service"

type SaleReturnPageProps = {
  params: Promise<{ id: string }>
}

export default async function SaleReturnPage({ params }: SaleReturnPageProps) {
  const user = await requirePermission("returns", "read")

  if (!hasPermission(user, "returns", "write")) {
    redirect(`/sales/${(await params).id}`)
  }

  const { id } = await params

  let sale

  try {
    sale = await getSaleReturnContext(user, id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }

    if (error instanceof ValidationError) {
      return (
        <>
          <PageHeader
            title="Procesar devolución"
            description="Devuelve artículos de una venta completada."
          />
          <Card>
            <CardHeader>
              <CardTitle>Devolución no disponible</CardTitle>
              <CardDescription>{error.message}</CardDescription>
            </CardHeader>
          </Card>
        </>
      )
    }

    throw error
  }

  if (sale.lines.length === 0) {
    return (
      <>
        <PageHeader
          title="Procesar devolución"
          description="Devuelve artículos de una venta completada."
        />
        <Card>
          <CardHeader>
            <CardTitle>No queda nada por devolver</CardTitle>
            <CardDescription>
              Todos los artículos de la venta {sale.documentNumber} ya fueron
              devueltos por completo.
            </CardDescription>
          </CardHeader>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Devolución ${sale.documentNumber}`}
        description="Selecciona líneas de venta, cantidades y opciones de reintegración. Inventario y totales se validan en el servidor."
      />

      <ReturnForm sale={sale} />
    </>
  )
}
