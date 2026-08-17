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
        description="Return detail and linked inventory movements."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Return information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Sale</p>
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
              <p className="text-sm text-muted-foreground">Warehouse</p>
              <p className="font-medium">{returnDoc.warehouseName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{formatDateTime(returnDoc.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created by</p>
              <p className="font-medium">{returnDoc.createdByName}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">Reason</p>
              <p className="font-medium">{returnDoc.reason}</p>
            </div>
            {returnDoc.notes ? (
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap font-medium">{returnDoc.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link href="/returns" className="text-primary hover:underline">
                Back to returns
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
          <CardTitle>Return lines</CardTitle>
          <CardDescription>
            Restockable lines increased sellable inventory via sale_return
            movements.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table aria-label="Return lines">
            <TableHeader>
              <TableHead isRowHeader id="product">
                Product
              </TableHead>
              <TableHead id="variant">Variant</TableHead>
              <TableHead id="sku">SKU</TableHead>
              <TableHead id="quantity" className="text-right">
                Qty
              </TableHead>
              <TableHead id="restockable">Restockable</TableHead>
              <TableHead id="before" className="text-right">
                Stock before
              </TableHead>
              <TableHead id="after" className="text-right">
                Stock after
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
                  <TableCell>{line.isRestockable ? "Yes" : "Damaged"}</TableCell>
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
