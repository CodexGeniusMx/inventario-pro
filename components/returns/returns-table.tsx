import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/format"
import type { ReturnListItem } from "@/types/returns"

type ReturnsTableProps = {
  returns: ReturnListItem[]
}

export function ReturnsTable({ returns }: ReturnsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table aria-label="Devoluciones">
        <TableHeader>
          <TableHead isRowHeader id="document">
            Devolución #
          </TableHead>
          <TableHead id="sale">Venta</TableHead>
          <TableHead id="warehouse" className="hidden md:table-cell">
            Almacén
          </TableHead>
          <TableHead id="reason">Motivo</TableHead>
          <TableHead id="items" className="hidden sm:table-cell">
            Artículos
          </TableHead>
          <TableHead id="qty" className="hidden sm:table-cell text-right">
            Cant.
          </TableHead>
          <TableHead id="date" className="hidden lg:table-cell">
            Fecha
          </TableHead>
          <TableHead id="createdBy" className="hidden lg:table-cell">
            Creado por
          </TableHead>
        </TableHeader>
        <TableBody>
          {returns.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link
                  href={`/returns/${item.id}`}
                  className="font-medium hover:underline"
                >
                  {item.documentNumber}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/sales/${item.saleId}`}
                  className="text-primary hover:underline"
                >
                  {item.saleDocumentNumber}
                </Link>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {item.warehouseName}
              </TableCell>
              <TableCell className="max-w-[12rem] truncate">
                {item.reason}
              </TableCell>
              <TableCell className="hidden tabular-nums sm:table-cell">
                {item.itemCount}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {item.totalQuantity}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {formatDateTime(item.createdAt)}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {item.createdByName}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
