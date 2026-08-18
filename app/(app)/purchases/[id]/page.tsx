import Link from "next/link"
import { notFound } from "next/navigation"
import { PackageCheck } from "lucide-react"

import { PurchaseStatusBadge } from "@/components/purchases/purchase-status-badge"
import { PageHeader } from "@/components/layout/page-header"
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
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { NotFoundError } from "@/lib/errors/app-error"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { getPurchaseOrderById } from "@/services/purchasing/purchase.service"

type PurchaseDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function PurchaseDetailPage({
  params,
}: PurchaseDetailPageProps) {
  const user = await requirePermission("purchases", "read")
  const canReceive =
    hasPermission(user, "purchases", "receive") &&
    user.role === "admin"
  const { id } = await params

  let purchase

  try {
    purchase = await getPurchaseOrderById(user, id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }

    throw error
  }

  const canReceiveNow =
    canReceive &&
    (purchase.status === "ordered" || purchase.status === "partially_received") &&
    purchase.lines.some((line) => line.quantityRemaining > 0)

  return (
    <>
      <PageHeader
        title={purchase.documentNumber}
        description="Detalle de orden de compra, líneas e historial de recepciones."
        actions={
          canReceiveNow ? (
            <LinkButton href={`/purchases/${purchase.id}/receive`}>
              <PackageCheck data-icon="inline-start" />
              Recibir mercancía
            </LinkButton>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información de la compra</CardTitle>
            <CardDescription>
              <PurchaseStatusBadge status={purchase.status} />
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Proveedor</p>
              <p className="font-medium">
                <Link
                  href={`/suppliers/${purchase.supplierId}`}
                  className="hover:underline"
                >
                  {purchase.supplierName}
                </Link>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Almacén</p>
              <p className="font-medium">{purchase.warehouseName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de orden</p>
              <p className="font-medium">
                {purchase.orderedAt
                  ? formatDateTime(purchase.orderedAt)
                  : formatDateTime(purchase.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Creado por</p>
              <p className="font-medium">{purchase.createdByName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subtotal</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(purchase.subtotal)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(purchase.total)}
              </p>
            </div>
            {purchase.notes && (
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="font-medium">{purchase.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relacionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link href="/purchases" className="text-primary hover:underline">
                Volver a compras
              </Link>
            </p>
            <p>
              <Link
                href={`/suppliers/${purchase.supplierId}`}
                className="text-primary hover:underline"
              >
                Ver proveedor
              </Link>
            </p>
            <p>
              <Link href="/inventory/movements" className="text-primary hover:underline">
                Ver movimientos de inventario
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Líneas de compra</CardTitle>
          <CardDescription>
            Cantidades ordenadas, recibidas y restantes por variante.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table aria-label="Líneas de orden de compra">
            <TableHeader>
              <TableHead isRowHeader id="product">
                Producto
              </TableHead>
              <TableHead id="variant">Variante</TableHead>
              <TableHead id="sku">SKU</TableHead>
              <TableHead id="ordered" className="text-right">
                Ordenada
              </TableHead>
              <TableHead id="received" className="text-right">
                Recibida
              </TableHead>
              <TableHead id="remaining" className="text-right">
                Restante
              </TableHead>
              <TableHead id="unitCost" className="text-right">
                Costo unitario
              </TableHead>
              <TableHead id="lineTotal" className="text-right">
                Total de línea
              </TableHead>
            </TableHeader>
            <TableBody>
              {purchase.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.productName}</TableCell>
                  <TableCell>{line.variantName}</TableCell>
                  <TableCell className="font-mono text-xs">{line.sku}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.quantityOrdered}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.quantityReceived}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.quantityRemaining}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(line.unitCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(line.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {purchase.receipts.length > 0 && (
        <div className="mt-4 space-y-4">
          <h2 className="text-lg font-semibold">Historial de recepciones</h2>
          {purchase.receipts.map((receipt) => (
            <Card key={receipt.id}>
              <CardHeader>
                <CardTitle>{receipt.documentNumber}</CardTitle>
                <CardDescription>
                  Recibido {formatDateTime(receipt.receivedAt)} por{" "}
                  {receipt.createdByName}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {receipt.notes && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    {receipt.notes}
                  </p>
                )}
                <Table aria-label={`Recepción ${receipt.documentNumber}`}>
                  <TableHeader>
                    <TableHead isRowHeader id="product">
                      Producto
                    </TableHead>
                    <TableHead id="variant">Variante</TableHead>
                    <TableHead id="sku">SKU</TableHead>
                    <TableHead id="qty" className="text-right">
                      Recibida
                    </TableHead>
                    <TableHead id="cost" className="text-right">
                      Costo unitario
                    </TableHead>
                    <TableHead id="before" className="text-right">
                      Stock antes
                    </TableHead>
                    <TableHead id="after" className="text-right">
                      Stock después
                    </TableHead>
                  </TableHeader>
                  <TableBody>
                    {receipt.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.productName}</TableCell>
                        <TableCell>{line.variantName}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {line.sku}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {line.quantityReceived}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(line.unitCost)}
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
          ))}
        </div>
      )}
    </>
  )
}
