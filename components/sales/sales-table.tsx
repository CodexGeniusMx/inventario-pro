import Link from "next/link"

import { SaleStatusBadge } from "@/components/sales/sale-status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDateTime } from "@/lib/format"
import type { SaleListItem } from "@/types/sales"

type SalesTableProps = {
  sales: SaleListItem[]
}

export function SalesTable({ sales }: SalesTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table aria-label="Ventas">
        <TableHeader>
          <TableHead isRowHeader id="document">
            Venta #
          </TableHead>
          <TableHead id="customer">Cliente</TableHead>
          <TableHead id="status">Estado</TableHead>
          <TableHead id="date" className="hidden md:table-cell">
            Fecha
          </TableHead>
          <TableHead id="warehouse" className="hidden lg:table-cell">
            Almacén
          </TableHead>
          <TableHead id="items" className="hidden sm:table-cell">
            Artículos
          </TableHead>
          <TableHead id="total" className="text-right">
            Total
          </TableHead>
          <TableHead id="createdBy" className="hidden lg:table-cell">
            Creado por
          </TableHead>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell>
                <Link
                  href={`/sales/${sale.id}`}
                  className="font-medium hover:underline"
                >
                  {sale.documentNumber}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {sale.customerName ?? "Cliente ocasional"}
              </TableCell>
              <TableCell>
                <SaleStatusBadge status={sale.status} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {formatDateTime(sale.completedAt ?? sale.createdAt)}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {sale.warehouseName}
              </TableCell>
              <TableCell className="hidden tabular-nums sm:table-cell">
                {sale.itemCount}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(sale.total)}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {sale.createdByName}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
