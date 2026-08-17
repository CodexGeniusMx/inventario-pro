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
        description="Purchase order detail, lines, and receipt history."
        actions={
          canReceiveNow ? (
            <LinkButton href={`/purchases/${purchase.id}/receive`}>
              <PackageCheck data-icon="inline-start" />
              Receive goods
            </LinkButton>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Purchase information</CardTitle>
            <CardDescription>
              <PurchaseStatusBadge status={purchase.status} />
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Supplier</p>
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
              <p className="text-sm text-muted-foreground">Warehouse</p>
              <p className="font-medium">{purchase.warehouseName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order date</p>
              <p className="font-medium">
                {purchase.orderedAt
                  ? formatDateTime(purchase.orderedAt)
                  : formatDateTime(purchase.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created by</p>
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
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{purchase.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link href="/purchases" className="text-primary hover:underline">
                Back to purchases
              </Link>
            </p>
            <p>
              <Link
                href={`/suppliers/${purchase.supplierId}`}
                className="text-primary hover:underline"
              >
                View supplier
              </Link>
            </p>
            <p>
              <Link href="/inventory/movements" className="text-primary hover:underline">
                View inventory movements
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Purchase lines</CardTitle>
          <CardDescription>
            Ordered, received, and remaining quantities per variant.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table aria-label="Purchase order lines">
            <TableHeader>
              <TableHead isRowHeader id="product">
                Product
              </TableHead>
              <TableHead id="variant">Variant</TableHead>
              <TableHead id="sku">SKU</TableHead>
              <TableHead id="ordered" className="text-right">
                Ordered
              </TableHead>
              <TableHead id="received" className="text-right">
                Received
              </TableHead>
              <TableHead id="remaining" className="text-right">
                Remaining
              </TableHead>
              <TableHead id="unitCost" className="text-right">
                Unit cost
              </TableHead>
              <TableHead id="lineTotal" className="text-right">
                Line total
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
          <h2 className="text-lg font-semibold">Receipt history</h2>
          {purchase.receipts.map((receipt) => (
            <Card key={receipt.id}>
              <CardHeader>
                <CardTitle>{receipt.documentNumber}</CardTitle>
                <CardDescription>
                  Received {formatDateTime(receipt.receivedAt)} by{" "}
                  {receipt.createdByName}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {receipt.notes && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    {receipt.notes}
                  </p>
                )}
                <Table aria-label={`Receipt ${receipt.documentNumber}`}>
                  <TableHeader>
                    <TableHead isRowHeader id="product">
                      Product
                    </TableHead>
                    <TableHead id="variant">Variant</TableHead>
                    <TableHead id="sku">SKU</TableHead>
                    <TableHead id="qty" className="text-right">
                      Received
                    </TableHead>
                    <TableHead id="cost" className="text-right">
                      Unit cost
                    </TableHead>
                    <TableHead id="before" className="text-right">
                      Stock before
                    </TableHead>
                    <TableHead id="after" className="text-right">
                      Stock after
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
