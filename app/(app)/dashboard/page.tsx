import {
  AlertTriangle,
  Boxes,
  DollarSign,
  Package,
  PackageX,
  ShoppingCart,
  TrendingUp,
  Warehouse,
} from "lucide-react"

import {
  DashboardChartSection,
  parseDashboardChartRange,
} from "@/components/dashboard/dashboard-chart-section"
import {
  LowStockAlert,
  QuickActions,
} from "@/components/dashboard/dashboard-alerts"
import {
  MetricCardCount,
  MetricCardCurrency,
} from "@/components/dashboard/metric-card"
import {
  RecentPurchasesTable,
  RecentReturnsTable,
} from "@/components/dashboard/recent-activity-tables"
import { RecentMovementsTable } from "@/components/dashboard/recent-movements-table"
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table"
import { TopProductsTable } from "@/components/dashboard/top-products-table"
import { PageHeader } from "@/components/layout/page-header"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDashboardHeadingDate } from "@/lib/reports/date-ranges"
import { requireUser } from "@/lib/auth/session"
import { formatNumber, formatPercent } from "@/lib/format"
import { getDashboardSummary } from "@/services/reporting/dashboard.service"

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser()
  const params = await searchParams
  const chartRangeDays = parseDashboardChartRange(params.chart)

  let summary: Awaited<ReturnType<typeof getDashboardSummary>> | null = null
  let loadError: string | null = null

  try {
    summary = await getDashboardSummary(user, { chartRangeDays })
  } catch {
    loadError = "Unable to load dashboard metrics from the database."
  }

  if (loadError || !summary) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description={`Overview for ${user.organizationName}`}
        />
        <Card>
          <CardHeader>
            <CardTitle>Unable to load dashboard</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      </>
    )
  }

  const { metrics, canViewFinancials } = summary

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Overview for ${summary.organizationName} · ${formatDashboardHeadingDate()}`}
      />

      <LowStockAlert
        lowStockCount={metrics.lowStockCount}
        outOfStockCount={metrics.outOfStockCount}
        products={summary.lowStockProducts}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canViewFinancials ? (
          <>
            <MetricCardCurrency
              title="Revenue today"
              amount={metrics.revenueToday}
              subtitle={`${formatNumber(metrics.salesTodayCount)} sales`}
              change={metrics.salesTodayChange ?? undefined}
              icon={ShoppingCart}
            />
            <MetricCardCurrency
              title="Revenue this month"
              amount={metrics.revenueMonth}
              subtitle={`${formatNumber(metrics.salesMonthCount)} sales`}
              change={metrics.revenueMonthChange ?? undefined}
              icon={TrendingUp}
            />
            <MetricCardCurrency
              title="Estimated gross profit"
              amount={metrics.estimatedGrossProfitMonth}
              subtitle={
                metrics.estimatedGrossProfitMargin !== null
                  ? `${formatPercent(metrics.estimatedGrossProfitMargin).replace("+", "")} margin this month`
                  : "This month · net revenue minus estimated COGS"
              }
              icon={DollarSign}
            />
            <MetricCardCurrency
              title="Inventory value"
              amount={metrics.inventoryValue}
              subtitle="Active products at resolved cost"
              icon={Warehouse}
            />
          </>
        ) : (
          <>
            <MetricCardCount
              title="Sales today"
              count={metrics.salesTodayCount}
              subtitle="Completed sales"
              icon={ShoppingCart}
            />
            <MetricCardCount
              title="Sales this month"
              count={metrics.salesMonthCount}
              subtitle="Completed sales"
              icon={TrendingUp}
            />
            <MetricCardCurrency
              title="Inventory value"
              amount={metrics.inventoryValue}
              subtitle="Active products at resolved cost"
              icon={Warehouse}
            />
            <MetricCardCount
              title="Units in stock"
              count={metrics.totalUnitsInStock}
              subtitle="Across active variants"
              icon={Boxes}
            />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCardCount
          title="Active products"
          count={metrics.activeProductsCount}
          subtitle="Catalog products"
          icon={Package}
        />
        {canViewFinancials ? (
          <MetricCardCount
            title="Units in stock"
            count={metrics.totalUnitsInStock}
            subtitle="Across active variants"
            icon={Boxes}
          />
        ) : null}
        <MetricCardCount
          title="Low-stock items"
          count={metrics.lowStockCount}
          subtitle="At or below reorder point"
          icon={AlertTriangle}
          variant="warning"
        />
        <MetricCardCount
          title="Out-of-stock items"
          count={metrics.outOfStockCount}
          subtitle="Zero units available"
          icon={PackageX}
          variant="danger"
        />
      </div>

      {canViewFinancials ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <DashboardChartSection
              chartRangeDays={summary.salesChartRangeDays}
              data={summary.salesChart}
            />
          </div>
          <TopProductsTable products={summary.topProducts} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <RecentSalesTable sales={summary.recentSales} />
        <RecentMovementsTable movements={summary.recentMovements} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <RecentPurchasesTable purchases={summary.recentPurchases} />
        <RecentReturnsTable returns={summary.recentReturns} />
      </div>

      <div className="mt-6 rounded-xl border bg-muted/30 p-4">
        <QuickActions />
      </div>
    </>
  )
}
