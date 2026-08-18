import Link from "next/link"

import { WarehouseStatusBadges } from "@/components/inventory/warehouse-status-badges"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/format"
import type { WarehouseRow } from "@/types/inventory"

type WarehousesTableProps = {
  warehouses: WarehouseRow[]
  canManage: boolean
}

export function WarehousesTable({ warehouses, canManage }: WarehousesTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table aria-label="Almacenes">
        <TableHeader>
          <TableHead isRowHeader id="name">
            Nombre
          </TableHead>
          <TableHead id="code">Código</TableHead>
          <TableHead id="address">Dirección</TableHead>
          <TableHead id="status">Estado</TableHead>
          <TableHead id="updated">Actualizado</TableHead>
          {canManage && <TableHead id="actions">Acciones</TableHead>}
        </TableHeader>
        <TableBody>
          {warehouses.map((warehouse) => (
            <TableRow key={warehouse.id}>
              <TableCell className="font-medium">{warehouse.name}</TableCell>
              <TableCell className="font-mono text-xs">{warehouse.code}</TableCell>
              <TableCell className="max-w-[220px] truncate text-muted-foreground">
                {warehouse.address ?? "—"}
              </TableCell>
              <TableCell>
                <WarehouseStatusBadges warehouse={warehouse} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(warehouse.updatedAt)}
              </TableCell>
              {canManage && (
                <TableCell>
                  <Link
                    href={`/inventory/warehouses/${warehouse.id}/edit`}
                    className="text-primary hover:underline"
                  >
                    Editar
                  </Link>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
