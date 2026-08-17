import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { SaleStatusBadge } from "@/components/sales/sale-status-badge"
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
import { formatCurrency, formatDateTime } from "@/lib/format"
import { getSaleById } from "@/services/sales/sale.service"

type SaleDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const user = await requirePermission("sales", "read")
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

  return (
    <>
      <PageHeader
        title={sale.documentNumber}
        description="Sale detail, line items, and linked inventory movements."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sale information</CardTitle>
            <CardDescription>
              <SaleStatusBadge status={sale.status} />
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">
                {sale.customerId ? (
                  <Link
                    href={`/customers/${sale.customerId}`}
                    className="hover:underline"
                  >
                    {sale.customerName}
                  </Link>
                ) : (
                  "Walk-in"
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Warehouse</p>
              <p className="font-medium">{sale.warehouseName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">
                {formatDateTime(sale.completedAt ?? sale.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created by</p>
              <p className="font-medium">{sale.createdByName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subtotal</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(sale.subtotal)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Discount</p>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link href="/sales" className="text-primary hover:underline">
                Back to sales
              </Link>
            </p>
            <p>
              <Link
                href="/inventory/movements"
                className="text-primary hover:underline"
              >
                View inventory movements
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Sale lines</CardTitle>
          <CardDescription>
            Each completed line created an inventory movement when stock was
            deducted.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table aria-label="Sale lines">
            <TableHeader>
              <TableHead isRowHeader id="product">
                Product
              </TableHead>
              <TableHead id="variant">Variant</TableHead>
              <TableHead id="sku">SKU</TableHead>
              <TableHead id="quantity" className="text-right">
                Qty
              </TableHead>
              <TableHead id="unitPrice" className="text-right">
                Unit price
              </TableHead>
              <TableHead id="lineTotal" className="text-right">
                Line total
              </TableHead>
              <TableHead id="before" className="text-right">
                Stock before
              </TableHead>
              <TableHead id="after" className="text-right">
                Stock after
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
