import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { ReportExportButton } from "@/components/reports/report-export-button"
import { ReportFiltersForm } from "@/components/reports/report-filters-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requirePermission } from "@/lib/auth/session"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format"
import { resolveReportDateRange } from "@/lib/reports/date-ranges"
import { reportFiltersSchema } from "@/lib/validations/report.schema"
import {
  getInventoryReport,
  getMovementReport,
  getProductReport,
  getPurchaseReport,
  getSalesReport,
  listReportFilterOptions,
} from "@/services/reporting/report.service"
import { REPORT_DEFINITIONS, type ReportSlug } from "@/types/reports"

type ReportDetailPageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function isReportSlug(value: string): value is ReportSlug {
  return REPORT_DEFINITIONS.some((report) => report.slug === value)
}

export default async function ReportDetailPage({
  params,
  searchParams,
}: ReportDetailPageProps) {
  const user = await requirePermission("reports", "read")
  const { slug } = await params

  if (!isReportSlug(slug)) {
    notFound()
  }

  const definition = REPORT_DEFINITIONS.find((report) => report.slug === slug)!
  const rawParams = await searchParams
  const parsedFilters = reportFiltersSchema.safeParse({
    preset: getParam(rawParams.preset),
    from: getParam(rawParams.from),
    to: getParam(rawParams.to),
    warehouseId: getParam(rawParams.warehouseId),
    supplierId: getParam(rawParams.supplierId),
    customerId: getParam(rawParams.customerId),
    movementType: getParam(rawParams.movementType),
  })

  const filters = parsedFilters.success
    ? parsedFilters.data
    : reportFiltersSchema.parse({})
  const range = resolveReportDateRange(filters)
  const filterOptions = await listReportFilterOptions(user)

  let loadError: string | null = null

  try {
    if (slug === "sales") {
      const { summary, rows } = await getSalesReport(user, filters)

      return (
        <ReportLayout
          slug={slug}
          title={definition.title}
          description={`${definition.description} · ${range.label}`}
          filters={filters}
          filterOptions={filterOptions}
          searchParams={Object.fromEntries(
            Object.entries(rawParams).map(([key, value]) => [
              key,
              getParam(value),
            ])
          )}
        >
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Sales count" value={formatNumber(summary.salesCount)} />
            <SummaryCard label="Units sold (net)" value={formatNumber(summary.unitsSold)} />
            <SummaryCard label="Net revenue" value={formatCurrency(summary.netRevenue)} />
            <SummaryCard
              label="Estimated gross profit"
              value={formatCurrency(summary.estimatedGrossProfit)}
            />
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Discounts" value={formatCurrency(summary.discountTotal)} />
            <SummaryCard label="Return units" value={formatNumber(summary.returnUnits)} />
            <SummaryCard label="Return revenue" value={formatCurrency(summary.returnRevenue)} />
            <SummaryCard label="Estimated COGS" value={formatCurrency(summary.estimatedCogs)} />
          </div>

          <DataTable
            headers={[
              "Sale #",
              "Completed",
              "Customer",
              "Warehouse",
              "Items",
              "Units",
              "Net total",
              "Discount",
              "Status",
            ]}
            rows={rows.map((row) => [
              row.documentNumber,
              row.completedAt ? formatDateTime(row.completedAt) : "—",
              row.customerName ?? "Walk-in",
              row.warehouseName,
              row.itemCount,
              row.unitsSold,
              formatCurrency(row.netTotal),
              formatCurrency(row.discountAmount),
              row.status,
            ])}
          />
        </ReportLayout>
      )
    }

    if (slug === "inventory") {
      const rows = await getInventoryReport(user, filters)
      const totalValue = rows.reduce((sum, row) => sum + row.inventoryValue, 0)

      return (
        <ReportLayout
          slug={slug}
          title={definition.title}
          description={`${definition.description} · total value ${formatCurrency(totalValue)}`}
          filters={filters}
          filterOptions={filterOptions}
          searchParams={Object.fromEntries(
            Object.entries(rawParams).map(([key, value]) => [
              key,
              getParam(value),
            ])
          )}
          showWarehouse
        >
          <DataTable
            headers={[
              "Product",
              "Variant",
              "SKU",
              "Warehouse",
              "Stock",
              "Reorder",
              "Status",
              "Unit cost",
              "Value",
            ]}
            rows={rows.map((row) => [
              row.productName,
              row.variantName,
              row.sku,
              row.warehouseName,
              row.quantityOnHand,
              row.reorderPoint,
              row.stockStatus,
              formatCurrency(row.unitCost),
              formatCurrency(row.inventoryValue),
            ])}
          />
        </ReportLayout>
      )
    }

    if (slug === "movements") {
      const rows = await getMovementReport(user, filters)

      return (
        <ReportLayout
          slug={slug}
          title={definition.title}
          description={`${definition.description} · ${range.label}`}
          filters={filters}
          filterOptions={filterOptions}
          searchParams={Object.fromEntries(
            Object.entries(rawParams).map(([key, value]) => [
              key,
              getParam(value),
            ])
          )}
          showWarehouse
          showMovementType
        >
          <DataTable
            headers={[
              "Date",
              "Type",
              "Product",
              "Variant",
              "SKU",
              "Warehouse",
              "Qty",
              "Before",
              "After",
              "User",
              "Reference",
              "Reason",
            ]}
            rows={rows.map((row) => [
              formatDateTime(row.createdAt),
              row.movementType,
              row.productName,
              row.variantName,
              row.sku,
              row.warehouseName,
              row.quantity,
              row.quantityBefore,
              row.quantityAfter,
              row.userName,
              row.reference,
              row.reason ?? "—",
            ])}
          />
        </ReportLayout>
      )
    }

    if (slug === "purchases") {
      const rows = await getPurchaseReport(user, filters)

      return (
        <ReportLayout
          slug={slug}
          title={definition.title}
          description={`${definition.description} · ${range.label}`}
          filters={filters}
          filterOptions={filterOptions}
          searchParams={Object.fromEntries(
            Object.entries(rawParams).map(([key, value]) => [
              key,
              getParam(value),
            ])
          )}
          showWarehouse
          showSupplier
        >
          <DataTable
            headers={[
              "PO #",
              "Supplier",
              "Warehouse",
              "Status",
              "Ordered",
              "Total",
              "Ordered qty",
              "Received qty",
              "Last received",
            ]}
            rows={rows.map((row) => [
              row.documentNumber,
              row.supplierName,
              row.warehouseName,
              row.status,
              row.orderedAt ? formatDateTime(row.orderedAt) : "—",
              formatCurrency(row.total),
              row.unitsOrdered,
              row.unitsReceived,
              row.lastReceivedAt ? formatDateTime(row.lastReceivedAt) : "—",
            ])}
          />
        </ReportLayout>
      )
    }

    const rows = await getProductReport(user, filters)

    return (
      <ReportLayout
        slug={slug}
        title={definition.title}
        description={`${definition.description} · ${range.label}`}
        filters={filters}
        filterOptions={filterOptions}
        searchParams={Object.fromEntries(
          Object.entries(rawParams).map(([key, value]) => [key, getParam(value)])
        )}
      >
        <DataTable
          headers={[
            "Product",
            "Variant",
            "SKU",
            "Units sold",
            "Net revenue",
            "On hand",
            "Stock status",
            "Last movement",
          ]}
          rows={rows.map((row) => [
            row.productName,
            row.variantName,
            row.sku,
            row.unitsSold,
            formatCurrency(row.netRevenue),
            row.quantityOnHand,
            row.stockStatus ?? "—",
            row.lastMovementAt ? formatDateTime(row.lastMovementAt) : "—",
          ])}
        />
      </ReportLayout>
    )
  } catch {
    loadError = "Unable to load this report from the database."
  }

  return (
    <>
      <PageHeader title={definition.title} description={definition.description} />
      <Card>
        <CardHeader>
          <CardTitle>Unable to load report</CardTitle>
          <CardDescription>{loadError}</CardDescription>
        </CardHeader>
      </Card>
    </>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: Array<Array<string | number>>
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No data found</CardTitle>
          <CardDescription>Try adjusting the filters for this report.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-muted-foreground">
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b last:border-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 align-top tabular-nums">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function ReportLayout({
  slug,
  title,
  description,
  filters,
  filterOptions,
  searchParams,
  children,
  showWarehouse = false,
  showSupplier = false,
  showCustomer = false,
  showMovementType = false,
}: {
  slug: ReportSlug
  title: string
  description: string
  filters: {
    preset?: string
    from?: string
    to?: string
    warehouseId?: string
    supplierId?: string
    customerId?: string
    movementType?: string
  }
  filterOptions: Awaited<ReturnType<typeof listReportFilterOptions>>
  searchParams: Record<string, string | undefined>
  children: React.ReactNode
  showWarehouse?: boolean
  showSupplier?: boolean
  showCustomer?: boolean
  showMovementType?: boolean
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/reports" className="text-sm text-primary hover:underline">
              All reports
            </Link>
            <ReportExportButton slug={slug} searchParams={searchParams} />
          </div>
        }
      />

      <ReportFiltersForm
        actionPath={`/reports/${slug}`}
        values={{
          preset: (filters.preset as never) ?? "last_30_days",
          from: filters.from,
          to: filters.to,
          warehouseId: filters.warehouseId,
          supplierId: filters.supplierId,
          customerId: filters.customerId,
          movementType: filters.movementType,
        }}
        warehouses={filterOptions.warehouses}
        suppliers={filterOptions.suppliers}
        customers={filterOptions.customers}
        movementTypes={filterOptions.movementTypes}
        showWarehouse={showWarehouse || slug === "inventory"}
        showSupplier={showSupplier}
        showCustomer={showCustomer || slug === "sales"}
        showMovementType={showMovementType}
      />

      {children}
    </>
  )
}
