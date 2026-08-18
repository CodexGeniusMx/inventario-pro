import Link from "next/link"
import { notFound } from "next/navigation"
import { RotateCcw } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { SaleStatusBadge } from "@/components/sales/sale-status-badge"
import { LinkButton } from "@/components/ui/button"
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
import { hasPermission } from "@/lib/auth/permissions"
import { NotFoundError } from "@/lib/errors/app-error"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { getSaleById } from "@/services/sales/sale.service"

type SaleDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const user = await requirePermission("sales", "read")
  const canReturn =
    hasPermission(user, "returns", "read") &&
    hasPermission(user, "returns", "write")
  const { id } = await params

  let sale

  try {
    sale = await getSaleById(user, id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }

    throw error
  }

  const hasReturnableLines = sale.lines.some(
    (line) => line.quantityReturned < line.quantity
  )
  const showReturnAction =
    canReturn &&
    hasReturnableLines &&
    (sale.status === "completed" || sale.status === "partially_returned")

  return (
    <>
      <PageHeader
        title={sale.documentNumber}
        description="Detalle de venta, líneas y movimientos de inventario vinculados."
        actions={
          showReturnAction ? (
            <LinkButton href={`/sales/${sale.id}/return`}>
              <RotateCcw data-icon="inline-start" />
              Procesar devolución
            </LinkButton>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información de la venta</CardTitle>
            <CardDescription>
              <SaleStatusBadge status={sale.status} />
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">
                {sale.customerId ? (
                  <Link
                    href={`/customers/${sale.customerId}`}
                    className="hover:underline"
                  >
                    {sale.customerName}
                  </Link>
                ) : (
                  "Cliente ocasional"
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Almacén</p>
              <p className="font-medium">{sale.warehouseName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-medium">
                {formatDateTime(sale.completedAt ?? sale.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Creado por</p>
              <p className="font-medium">{sale.createdByName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subtotal</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(sale.subtotal)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Descuento</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(sale.discountAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(sale.total)}
              </p>
            </div>
            {sale.notes ? (
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="whitespace-pre-wrap font-medium">{sale.notes}</p>
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
              <Link href="/sales" className="text-primary hover:underline">
                Volver a ventas
              </Link>
            </p>
            <p>
              <Link href="/returns" className="text-primary hover:underline">
                Ver devoluciones
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
          <CardTitle>Líneas de venta</CardTitle>
          <CardDescription>
            Each completed line created an inventory movement when stock was
            deducted.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table aria-label="Líneas de venta">
            <TableHeader>
              <TableHead isRowHeader id="product">
                Producto
              </TableHead>
              <TableHead id="variant">Variante</TableHead>
              <TableHead id="sku">SKU</TableHead>
              <TableHead id="quantity" className="text-right">
                Cant.
              </TableHead>
              <TableHead id="returned" className="text-right">
                Devuelto
              </TableHead>
              <TableHead id="unitPrice" className="text-right">
                Precio unitario
              </TableHead>
              <TableHead id="lineTotal" className="text-right">
                Total de línea
              </TableHead>
              <TableHead id="before" className="text-right">
                Stock antes
              </TableHead>
              <TableHead id="after" className="text-right">
                Stock después
              </TableHead>
            </TableHeader>
            <TableBody>
              {sale.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.productName}</TableCell>
                  <TableCell>{line.variantName}</TableCell>
                  <TableCell className="font-mono text-xs">{line.sku}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.quantityReturned}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(line.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(line.lineTotal)}
                  </TableCell>
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
