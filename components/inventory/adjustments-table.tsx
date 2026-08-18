import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adjustmentTypeLabels } from "@/lib/inventory/labels"
import { formatDateTime } from "@/lib/format"
import type { AdjustmentListItem } from "@/types/inventory"

type AdjustmentsTableProps = {
  adjustments: AdjustmentListItem[]
}

export function AdjustmentsTable({ adjustments }: AdjustmentsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table aria-label="Ajustes de stock">
        <TableHeader>
          <TableHead isRowHeader id="document">
            Documento
          </TableHead>
          <TableHead id="type">Tipo</TableHead>
          <TableHead id="warehouse">Almacén</TableHead>
          <TableHead id="reason">Motivo</TableHead>
          <TableHead id="lines" className="text-right">
            Líneas
          </TableHead>
          <TableHead id="user">Creado por</TableHead>
          <TableHead id="created">Creado</TableHead>
        </TableHeader>
        <TableBody>
          {adjustments.map((adjustment) => (
            <TableRow key={adjustment.id}>
              <TableCell>
                <Link
                  href={`/inventory/adjustments/${adjustment.id}`}
                  className="font-medium hover:underline"
                >
                  {adjustment.documentNumber}
                </Link>
              </TableCell>
              <TableCell>
                {adjustmentTypeLabels[adjustment.adjustmentType]}
              </TableCell>
              <TableCell>{adjustment.warehouseName}</TableCell>
              <TableCell className="max-w-[220px] truncate">
                {adjustment.reason}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {adjustment.lineCount}
              </TableCell>
              <TableCell>{adjustment.createdByName}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(adjustment.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
