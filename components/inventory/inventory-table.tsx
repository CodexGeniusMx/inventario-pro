import Link from "next/link"

import { StockStatusBadge } from "@/components/inventory/stock-status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatRelativeTime } from "@/lib/format"
import type { InventoryStatusItem } from "@/types/inventory"

type InventoryTableProps = {
  items: InventoryStatusItem[]
}

export function InventoryTable({ items }: InventoryTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table aria-label="Resumen de inventario">
        <TableHeader>
          <TableHead isRowHeader id="product">
            Producto
          </TableHead>
          <TableHead id="variant">Variante</TableHead>
          <TableHead id="sku">SKU</TableHead>
          <TableHead id="warehouse">Almacén</TableHead>
          <TableHead id="quantity" className="text-right">
            Disponible
          </TableHead>
          <TableHead id="reorderPoint" className="text-right">
            Punto de reorden
          </TableHead>
          <TableHead id="status">Estado</TableHead>
          <TableHead id="updated" className="hidden lg:table-cell">
            Actualizado
          </TableHead>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={`${item.productVariantId}-${item.warehouseId}`}>
              <TableCell>
                <Link
                  href={`/products/${item.productId}`}
                  className="font-medium hover:underline"
                >
                  {item.productName}
                </Link>
              </TableCell>
              <TableCell>{item.variantName}</TableCell>
              <TableCell className="font-mono text-xs">{item.sku}</TableCell>
              <TableCell className="text-muted-foreground">
                {item.warehouseName}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.quantityOnHand}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.reorderPoint}
              </TableCell>
              <TableCell>
                <StockStatusBadge status={item.stockStatus} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {formatRelativeTime(new Date(item.updatedAt))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
