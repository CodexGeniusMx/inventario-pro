import Link from "next/link"

import { SalesChart } from "@/components/dashboard/sales-chart"
import { dashboardChartRangeSchema } from "@/lib/validations/report.schema"

type DashboardChartSectionProps = {
  chartRangeDays: 7 | 30
  data: React.ComponentProps<typeof SalesChart>["data"]
}

export function DashboardChartSection({
  chartRangeDays,
  data,
}: DashboardChartSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard?chart=7"
          className={`rounded-md border px-3 py-1 text-xs font-medium ${
            chartRangeDays === 7
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground"
          }`}
        >
          7 días
        </Link>
        <Link
          href="/dashboard?chart=30"
          className={`rounded-md border px-3 py-1 text-xs font-medium ${
            chartRangeDays === 30
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground"
          }`}
        >
          30 días
        </Link>
      </div>
      <SalesChart data={data} rangeDays={chartRangeDays} />
    </div>
  )
}

export function parseDashboardChartRange(
  value: string | string[] | undefined
): 7 | 30 {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = dashboardChartRangeSchema.safeParse(raw)

  return parsed.success && parsed.data === "30" ? 30 : 7
}
