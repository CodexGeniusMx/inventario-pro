import Link from "next/link"
import { notFound } from "next/navigation"

import { InventorySubNav } from "@/components/inventory/inventory-sub-nav"
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
import {
  adjustmentTypeLabels,
  movementTypeLabels,
} from "@/lib/inventory/labels"
import { formatDateTime } from "@/lib/format"
import { getAdjustmentById } from "@/services/inventory/inventory.service"

type AdjustmentDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function AdjustmentDetailPage({
  params,
}: AdjustmentDetailPageProps) {
  const user = await requirePermission("inventory", "read")
  const { id } = await params

  let adjustment

  try {
    adjustment = await getAdjustmentById(user, id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }

    throw error
  }

  return (
    <>
      <PageHeader
        title={adjustment.documentNumber}
        description="Stock adjustment detail and linked inventory movements."
      />

      <InventorySubNav />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Adjustment information</CardTitle>
            <CardDescription>
              {adjustmentTypeLabels[adjustment.adjustmentType]}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Warehouse</p>
              <p className="font-medium">{adjustment.warehouseName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created by</p>
              <p className="font-medium">{adjustment.createdByName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reason</p>
              <p className="font-medium">{adjustment.reason}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {formatDateTime(adjustment.createdAt)}
              </p>
            </div>
            {adjustment.notes && (
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{adjustment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related records</CardTitle>
            <CardDescription>
              Movements linked to this adjustment are immutable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link
                href="/inventory/movements"
                className="text-primary hover:underline"
              >
                View movement history
              </Link>
            </p>
            <p>
              <Link
                href="/inventory/adjustments"
                className="text-primary hover:underline"
              >
                Back to adjustments
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Adjustment lines</CardTitle>
          <CardDescription>
            Each line created one inventory movement.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table aria-label="Adjustment lines">
            <TableHeader>
              <TableHead isRowHeader id="product">
                Product
              </TableHead>
              <TableHead id="variant">Variant</TableHead>
              <TableHead id="sku">SKU</TableHead>
              <TableHead id="quantity" className="text-right">
                Quantity
              </TableHead>
              <TableHead id="movementType">Movement</TableHead>
              <TableHead id="before" className="text-right">
                Before
              </TableHead>
              <TableHead id="after" className="text-right">
                After
              </TableHead>
            </TableHeader>
            <TableBody>
              {adjustment.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.productName}</TableCell>
                  <TableCell>{line.variantName}</TableCell>
                  <TableCell className="font-mono text-xs">{line.sku}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.quantity}
                  </TableCell>
                  <TableCell>
                    {line.movementType
                      ? movementTypeLabels[line.movementType]
                      : "—"}
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
