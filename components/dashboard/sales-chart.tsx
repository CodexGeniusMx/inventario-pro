import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { SalesChartPoint } from "@/lib/mock/dashboard"
import { formatCompactCurrency } from "@/lib/format"

type SalesChartProps = {
  data: SalesChartPoint[]
}

export function SalesChart({ data }: SalesChartProps) {
  const maxSales = Math.max(...data.map((point) => point.sales))
  const chartHeight = 160

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Sales this week</CardTitle>
        <CardDescription>Daily completed sales · Aug 10–16, 2026</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="flex items-end justify-between gap-2"
          role="img"
          aria-label="Bar chart of daily sales for the current week"
        >
          {data.map((point) => {
            const barHeight = Math.max(8, (point.sales / maxSales) * chartHeight)

            return (
              <div
                key={point.label}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {formatCompactCurrency(point.sales)}
                </span>
                <div
                  className="w-full max-w-10 rounded-t-md bg-primary/80"
                  style={{ height: `${barHeight}px` }}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {point.label}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
