import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatSignedQuantity,
  movementTypeLabels,
} from "@/lib/inventory/labels"
import { formatDateTime } from "@/lib/format"
import type { MovementListItem } from "@/types/inventory"

type MovementsTableProps = {
  movements: MovementListItem[]
}

export function MovementsTable({ movements }: MovementsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table aria-label="Inventory movements">
        <TableHeader>
          <TableHead isRowHeader id="date">
            Date
          </TableHead>
          <TableHead id="product">Product</TableHead>
          <TableHead id="variant">Variant</TableHead>
          <TableHead id="sku">SKU</TableHead>
          <TableHead id="warehouse">Warehouse</TableHead>
          <TableHead id="type">Type</TableHead>
          <TableHead id="change" className="text-right">
            Change
          </TableHead>
          <TableHead id="before" className="text-right">
            Before
          </TableHead>
          <TableHead id="after" className="text-right">
            After
          </TableHead>
          <TableHead id="reason">Reason</TableHead>
          <TableHead id="user">User</TableHead>
          <TableHead id="document">Document</TableHead>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(movement.createdAt)}
              </TableCell>
              <TableCell>{movement.productName}</TableCell>
              <TableCell>{movement.variantName}</TableCell>
              <TableCell className="font-mono text-xs">{movement.sku}</TableCell>
              <TableCell>{movement.warehouseName}</TableCell>
              <TableCell>{movementTypeLabels[movement.movementType]}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatSignedQuantity(movement.quantity)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {movement.quantityBefore}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {movement.quantityAfter}
              </TableCell>
              <TableCell className="max-w-[180px] truncate">
                {movement.reason ?? "—"}
              </TableCell>
              <TableCell>{movement.createdByName}</TableCell>
              <TableCell>
                {movement.relatedDocumentHref && movement.relatedDocumentLabel ? (
                  <Link
                    href={movement.relatedDocumentHref}
                    className="text-primary hover:underline"
                  >
                    {movement.relatedDocumentLabel}
                  </Link>
                ) : (
                  movement.relatedDocumentLabel ?? "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
