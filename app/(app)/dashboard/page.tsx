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
  RecentAdjustmentsTable,
  RecentPurchasesTable,
  RecentReceiptsTable,
  RecentReturnsTable,
} from "@/components/dashboard/recent-activity-tables"
import { RecentMovementsTable } from "@/components/dashboard/recent-movements-table"
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table"
import { TopProductsTable } from "@/components/dashboard/top-products-table"
import { PageHeader } from "@/components/layout/page-header"
import { APP_NAME } from "@/lib/i18n/branding"
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
  const summary = await getDashboardSummary(user, { chartRangeDays })
  const { metrics, canViewFinancials, canViewInventoryValue, canViewProfit } = summary

  return (
    <>
      <PageHeader
        title="Panel"
        description={`Resumen de ${APP_NAME} · ${formatDashboardHeadingDate(new Date(summary.generatedAt), user.organizationTimezone)}`}
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
              title="Ingresos de hoy"
              amount={metrics.revenueToday}
              subtitle={`${formatNumber(metrics.salesTodayCount)} ventas`}
              change={metrics.salesTodayChange ?? undefined}
              icon={ShoppingCart}
            />
            <MetricCardCurrency
              title="Ingresos del mes"
              amount={metrics.revenueMonth}
              subtitle={`${formatNumber(metrics.salesMonthCount)} ventas`}
              change={metrics.revenueMonthChange ?? undefined}
              icon={TrendingUp}
            />
            {canViewProfit ? (
              <MetricCardCurrency
                title="Utilidad bruta estimada"
                amount={metrics.estimatedGrossProfitMonth}
                subtitle={
                  metrics.estimatedGrossProfitMargin !== null
                    ? `${formatPercent(metrics.estimatedGrossProfitMargin).replace("+", "")} de margen este mes`
                    : "Este mes · ingresos netos menos costo de ventas estimado"
                }
                icon={DollarSign}
              />
            ) : (
              <MetricCardCount
                title="Ventas del mes"
                count={metrics.salesMonthCount}
                subtitle="Ventas completadas"
                icon={TrendingUp}
              />
            )}
            {canViewInventoryValue ? (
              <MetricCardCurrency
                title="Valor de inventario"
                amount={metrics.inventoryValue}
                subtitle="Productos activos al costo resuelto"
                icon={Warehouse}
              />
            ) : (
              <MetricCardCount
                title="Unidades en stock"
                count={metrics.totalUnitsInStock}
                subtitle="En variantes activas"
                icon={Warehouse}
              />
            )}
          </>
        ) : (
          <>
            <MetricCardCount
              title="Ventas de hoy"
              count={metrics.salesTodayCount}
              subtitle="Ventas completadas"
              icon={ShoppingCart}
            />
            <MetricCardCount
              title="Ventas del mes"
              count={metrics.salesMonthCount}
              subtitle="Ventas completadas"
              icon={TrendingUp}
            />
            <MetricCardCount
              title="Unidades en stock"
              count={metrics.totalUnitsInStock}
              subtitle="En variantes activas"
              icon={Boxes}
            />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCardCount
          title="Productos activos"
          count={metrics.activeProductsCount}
          subtitle="Productos del catálogo"
          icon={Package}
        />
        {canViewFinancials ? (
          <MetricCardCount
            title="Unidades en stock"
            count={metrics.totalUnitsInStock}
            subtitle="En variantes activas"
            icon={Boxes}
          />
        ) : null}
        <MetricCardCount
          title="Artículos con stock bajo"
          count={metrics.lowStockCount}
          subtitle="En o por debajo del punto de reorden"
          icon={AlertTriangle}
          variant="warning"
        />
        <MetricCardCount
          title="Artículos sin stock"
          count={metrics.outOfStockCount}
          subtitle="Cero unidades disponibles"
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
        <RecentReceiptsTable receipts={summary.recentReceipts} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <RecentAdjustmentsTable adjustments={summary.recentAdjustments} />
        <RecentReturnsTable returns={summary.recentReturns} />
      </div>

      <div className="mt-6 rounded-xl border bg-muted/30 p-4">
        <QuickActions />
      </div>
    </>
  )
}
