import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requirePermission } from "@/lib/auth/session"
import { NotFoundError } from "@/lib/errors/app-error"
import { formatDateTime } from "@/lib/format"
import { getReturnById } from "@/services/returns/return.service"

type ReturnDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function ReturnDetailPage({
  params,
}: ReturnDetailPageProps) {
  const user = await requirePermission("returns", "read")
  const { id } = await params

  let returnDoc

  try {
    returnDoc = await getReturnById(user, id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }

    throw error
  }

  return (
    <>
      <PageHeader
        title={returnDoc.documentNumber}
        description="Detalle de devolución y movimientos de inventario vinculados."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información de la devolución</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Venta</p>
              <p className="font-medium">
                <Link
                  href={`/sales/${returnDoc.saleId}`}
                  className="hover:underline"
                >
                  {returnDoc.saleDocumentNumber}
                </Link>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Almacén</p>
              <p className="font-medium">{returnDoc.warehouseName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-medium">{formatDateTime(returnDoc.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Creado por</p>
              <p className="font-medium">{returnDoc.createdByName}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">Motivo</p>
              <p className="font-medium">{returnDoc.reason}</p>
            </div>
            {returnDoc.notes ? (
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="whitespace-pre-wrap font-medium">{returnDoc.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relacionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link href="/returns" className="text-primary hover:underline">
                Volver a devoluciones
              </Link>
            </p>
            <p>
              <Link
                href="/inventory/movements"
                className="text-primary hover:underline"
              >
                Ver movimientos de inventario
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Líneas de devolución</CardTitle>
          <CardDescription>
            Las líneas reintegrables aumentaron el inventario vendible mediante movimientos sale_return.
            movements.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table aria-label="Líneas de devolución">
            <TableHeader>
              <TableHead isRowHeader id="product">
                Producto
              </TableHead>
              <TableHead id="variant">Variante</TableHead>
              <TableHead id="sku">SKU</TableHead>
              <TableHead id="quantity" className="text-right">
                Cant.
              </TableHead>
              <TableHead id="restockable">Reintegrable</TableHead>
              <TableHead id="before" className="text-right">
                Stock antes
              </TableHead>
              <TableHead id="after" className="text-right">
                Stock después
              </TableHead>
            </TableHeader>
            <TableBody>
              {returnDoc.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.productName}</TableCell>
                  <TableCell>{line.variantName}</TableCell>
                  <TableCell className="font-mono text-xs">{line.sku}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.quantity}
                  </TableCell>
                  <TableCell>{line.isRestockable ? "Sí" : "Dañado"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.quantityBefore ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.quantityAfter ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
