import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatCurrency, formatRelativeTime } from "@/lib/format"
import type { RecentSale } from "@/types/dashboard"

const saleStatusLabels: Record<RecentSale["status"], string> = {
  completed: "Completada",
  draft: "Borrador",
  partially_returned: "Devolución parcial",
  fully_returned: "Totalmente devuelta",
  cancelled: "Cancelada",
}

const saleStatusVariants: Record<
  RecentSale["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  completed: "default",
  draft: "secondary",
  partially_returned: "outline",
  fully_returned: "outline",
  cancelled: "destructive",
}

type RecentSalesTableProps = {
  sales: RecentSale[]
}

export function RecentSalesTable({ sales }: RecentSalesTableProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Ventas recientes</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Venta #</th>
                <th className="px-2 py-2 font-medium">Cliente</th>
                <th className="hidden px-2 py-2 font-medium sm:table-cell">
                  Artículos
                </th>
                <th className="px-2 py-2 text-right font-medium">Total</th>
                <th className="hidden px-2 py-2 font-medium md:table-cell">
                  Estado
                </th>
                <th className="px-4 py-2 text-right font-medium">Hora</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-2 font-mono text-xs">{sale.saleNumber}</td>
                  <td className="max-w-[140px] truncate px-2 py-2">
                    {sale.customer}
                  </td>
                  <td className="hidden px-2 py-2 tabular-nums sm:table-cell">
                    {sale.itemCount}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums font-medium">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="hidden px-2 py-2 md:table-cell">
                    <Badge variant={saleStatusVariants[sale.status]}>
                      {saleStatusLabels[sale.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {formatRelativeTime(new Date(sale.createdAt))}
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
