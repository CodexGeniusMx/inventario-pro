import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency, formatNumber } from "@/lib/format"
import type { TopProduct } from "@/types/dashboard"

type TopProductsTableProps = {
  products: TopProduct[]
}

export function TopProductsTable({ products }: TopProductsTableProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Productos más vendidos</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-2 py-2 font-medium">Producto</th>
                <th className="hidden px-2 py-2 font-medium sm:table-cell">
                  SKU
                </th>
                <th className="px-2 py-2 text-right font-medium">Unidades</th>
                <th className="px-4 py-2 text-right font-medium">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.sku}
                  className="border-b last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">
                    {product.rank}
                  </td>
                  <td className="max-w-[180px] truncate px-2 py-2">
                    <span className="font-medium">{product.product}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {product.variant}
                    </span>
                  </td>
                  <td className="hidden px-2 py-2 font-mono text-xs sm:table-cell">
                    {product.sku}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatNumber(product.unitsSold)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">
                    {formatCurrency(product.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
