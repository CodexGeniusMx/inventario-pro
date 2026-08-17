import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatCurrency, formatRelativeTime } from "@/lib/format"
import type { RecentSale } from "@/lib/mock/dashboard"

const saleStatusLabels: Record<RecentSale["status"], string> = {
  completed: "Completed",
  draft: "Draft",
  partially_returned: "Partial return",
}

const saleStatusVariants: Record<
  RecentSale["status"],
  "default" | "secondary" | "outline"
> = {
  completed: "default",
  draft: "secondary",
  partially_returned: "outline",
}

type RecentSalesTableProps = {
  sales: RecentSale[]
}

export function RecentSalesTable({ sales }: RecentSalesTableProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Recent sales</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Sale #</th>
                <th className="px-2 py-2 font-medium">Customer</th>
                <th className="hidden px-2 py-2 font-medium sm:table-cell">
                  Items
                </th>
                <th className="px-2 py-2 text-right font-medium">Total</th>
                <th className="hidden px-2 py-2 font-medium md:table-cell">
                  Status
                </th>
                <th className="px-4 py-2 text-right font-medium">Time</th>
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
                    {formatRelativeTime(sale.createdAt)}
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
