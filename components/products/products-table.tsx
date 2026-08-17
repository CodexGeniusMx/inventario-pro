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
      <Table aria-label="Products">
        <TableHeader>
          <TableHead isRowHeader id="product">
            Product
          </TableHead>
          <TableHead id="category">Category</TableHead>
          <TableHead id="variants" className="hidden md:table-cell">
            Variants
          </TableHead>
          <TableHead id="sku" className="hidden lg:table-cell">
            SKU
          </TableHead>
          <TableHead id="barcode" className="hidden xl:table-cell">
            Barcode
          </TableHead>
          <TableHead id="cost" className="text-right">
            Cost
          </TableHead>
          <TableHead id="salePrice" className="text-right">
            Sale price
          </TableHead>
          <TableHead id="status" className="hidden sm:table-cell">
            Status
          </TableHead>
          <TableHead id="updated" className="hidden lg:table-cell">
            Updated
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
