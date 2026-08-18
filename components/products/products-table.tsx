import Link from "next/link"

import { ProductStatusBadge } from "@/components/products/product-status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatRelativeTime } from "@/lib/format"
import type { ProductListItem } from "@/types/catalog"

type ProductsTableProps = {
  products: ProductListItem[]
}

export function ProductsTable({ products }: ProductsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table aria-label="Productos">
        <TableHeader>
          <TableHead isRowHeader id="product">
            Producto
          </TableHead>
          <TableHead id="category">Categoría</TableHead>
          <TableHead id="variants" className="hidden md:table-cell">
            Variantes
          </TableHead>
          <TableHead id="sku" className="hidden lg:table-cell">
            SKU
          </TableHead>
          <TableHead id="barcode" className="hidden xl:table-cell">
            Código de barras
          </TableHead>
          <TableHead id="cost" className="text-right">
            Costo
          </TableHead>
          <TableHead id="salePrice" className="text-right">
            Precio de venta
          </TableHead>
          <TableHead id="status" className="hidden sm:table-cell">
            Estado
          </TableHead>
          <TableHead id="updated" className="hidden lg:table-cell">
            Actualizado
          </TableHead>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Link
                  href={`/products/${product.id}`}
                  className="font-medium hover:underline"
                >
                  {product.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  per {product.unitOfMeasure}
                </p>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {product.categoryName ?? "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {product.variantCount}
              </TableCell>
              <TableCell className="hidden font-mono text-xs lg:table-cell">
                {product.primarySku ?? "—"}
              </TableCell>
              <TableCell className="hidden font-mono text-xs xl:table-cell">
                {product.primaryBarcode ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(product.costPrice)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(product.salePrice)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <ProductStatusBadge status={product.status} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {formatRelativeTime(new Date(product.updatedAt))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
