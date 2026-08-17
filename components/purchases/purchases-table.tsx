import Link from "next/link"

import { PurchaseStatusBadge } from "@/components/purchases/purchase-status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDateTime } from "@/lib/format"
import type { PurchaseOrderListItem } from "@/types/purchasing"

type PurchasesTableProps = {
  purchases: PurchaseOrderListItem[]
}

function formatReceivingProgress(ordered: number, received: number): string {
  if (ordered === 0) {
    return "—"
  }

  const percent = Math.round((received / ordered) * 100)
  return `${received}/${ordered} (${percent}%)`
}

export function PurchasesTable({ purchases }: PurchasesTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table aria-label="Purchase orders">
        <TableHeader>
          <TableHead isRowHeader id="document">
            PO number
          </TableHead>
          <TableHead id="supplier">Supplier</TableHead>
          <TableHead id="status">Status</TableHead>
          <TableHead id="orderedAt" className="hidden md:table-cell">
            Order date
          </TableHead>
          <TableHead id="warehouse" className="hidden lg:table-cell">
            Warehouse
          </TableHead>
          <TableHead id="progress" className="hidden sm:table-cell">
            Receiving
          </TableHead>
          <TableHead id="total" className="text-right">
            Total
          </TableHead>
          <TableHead id="createdBy" className="hidden xl:table-cell">
            Created by
          </TableHead>
        </TableHeader>
        <TableBody>
          {purchases.map((purchase) => (
            <TableRow key={purchase.id}>
              <TableCell>
                <Link
                  href={`/purchases/${purchase.id}`}
                  className="font-medium hover:underline"
                >
                  {purchase.documentNumber}
                </Link>
              </TableCell>
              <TableCell>{purchase.supplierName}</TableCell>
              <TableCell>
                <PurchaseStatusBadge status={purchase.status} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {purchase.orderedAt
                  ? formatDateTime(purchase.orderedAt)
                  : formatDateTime(purchase.createdAt)}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {purchase.warehouseName}
              </TableCell>
              <TableCell className="hidden tabular-nums sm:table-cell">
                {formatReceivingProgress(
                  purchase.quantityOrdered,
                  purchase.quantityReceived
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(purchase.total)}
              </TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">
                {purchase.createdByName}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
