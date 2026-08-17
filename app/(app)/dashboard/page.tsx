import {
  AlertTriangle,
  DollarSign,
  PackageX,
  ShoppingCart,
  TrendingUp,
  Warehouse,
} from "lucide-react"

import {
  LowStockAlert,
  QuickActions,
} from "@/components/dashboard/dashboard-alerts"
import {
  MetricCardCount,
  MetricCardCurrency,
} from "@/components/dashboard/metric-card"
import { RecentMovementsTable } from "@/components/dashboard/recent-movements-table"
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { TopProductsTable } from "@/components/dashboard/top-products-table"
import { PageHeader } from "@/components/layout/page-header"
import {
  dashboardMetrics,
  lowStockProducts,
  recentMovements,
  recentSales,
  topProducts,
  weeklySalesChart,
} from "@/lib/mock/dashboard"
import { formatNumber } from "@/lib/format"

export default function DashboardPage() {
  const { todaysSalesCount } = dashboardMetrics

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview for Distribuidora El Punto · Sunday, Aug 16, 2026"
      />

      <LowStockAlert
        lowStockCount={dashboardMetrics.lowStockCount}
        outOfStockCount={dashboardMetrics.outOfStockCount}
        products={lowStockProducts}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCardCurrency
          title="Today's sales"
          amount={dashboardMetrics.todaysSales}
          subtitle={`${formatNumber(todaysSalesCount)} sales`}
          change={dashboardMetrics.todaysSalesChange}
          icon={ShoppingCart}
        />
        <MetricCardCurrency
          title="Monthly sales"
          amount={dashboardMetrics.monthlySales}
          subtitle="August 2026"
          change={dashboardMetrics.monthlySalesChange}
          icon={TrendingUp}
        />
        <MetricCardCurrency
          title="Estimated profit"
          amount={dashboardMetrics.estimatedProfit}
          subtitle={`${dashboardMetrics.profitMargin}% margin`}
          icon={DollarSign}
        />
        <MetricCardCurrency
          title="Inventory value"
          amount={dashboardMetrics.inventoryValue}
          subtitle="At cost price"
          icon={Warehouse}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <MetricCardCount
          title="Low-stock products"
          count={dashboardMetrics.lowStockCount}
          subtitle="At or below reorder point"
          icon={AlertTriangle}
          variant="warning"
        />
        <MetricCardCount
          title="Out-of-stock products"
          count={dashboardMetrics.outOfStockCount}
          subtitle="Zero units available"
          icon={PackageX}
          variant="danger"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesChart data={weeklySalesChart} />
        </div>
        <TopProductsTable products={topProducts} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <RecentSalesTable sales={recentSales} />
        <RecentMovementsTable movements={recentMovements} />
      </div>

      <div className="mt-6 rounded-xl border bg-muted/30 p-4">
        <QuickActions />
      </div>
    </>
  )
}
