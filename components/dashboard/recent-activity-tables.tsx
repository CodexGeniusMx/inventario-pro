import Link from "next/link"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency, formatRelativeTime } from "@/lib/format"
import { adjustmentTypeLabel, purchaseOrderStatusLabel } from "@/lib/i18n/status-labels"
import type {
  RecentAdjustmentActivity,
  RecentPurchaseActivity,
  RecentPurchaseReceiptActivity,
  RecentReturnActivity,
} from "@/types/dashboard"

type RecentPurchasesTableProps = {
  purchases: RecentPurchaseActivity[]
}

export function RecentPurchasesTable({ purchases }: RecentPurchasesTableProps) {
  if (purchases.length === 0) {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Órdenes de compra recientes</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">OC #</th>
                <th className="px-2 py-2 font-medium">Proveedor</th>
                <th className="px-2 py-2 text-right font-medium">Total</th>
                <th className="hidden px-2 py-2 font-medium md:table-cell">
                  Estado
                </th>
                <th className="px-4 py-2 text-right font-medium">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2">
                    <Link
                      href={`/purchases/${purchase.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {purchase.documentNumber}
                    </Link>
                  </td>
                  <td className="max-w-[160px] truncate px-2 py-2">
                    {purchase.supplierName}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums font-medium">
                    {formatCurrency(purchase.total)}
                  </td>
                  <td className="hidden px-2 py-2 md:table-cell">
                    {purchaseOrderStatusLabel(purchase.status)}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {purchase.receivedAt
                      ? formatRelativeTime(new Date(purchase.receivedAt))
                      : "—"}
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

export function RecentReceiptsTable({
  receipts,
}: {
  receipts: RecentPurchaseReceiptActivity[]
}) {
  if (receipts.length === 0) {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Recepciones de compra recientes</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Recepción #</th>
                <th className="px-2 py-2 font-medium">OC #</th>
                <th className="px-2 py-2 font-medium">Almacén</th>
                <th className="px-2 py-2 text-right font-medium">Líneas</th>
                <th className="px-4 py-2 text-right font-medium">Recibida</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2 font-mono text-xs">
                    {receipt.documentNumber}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">
                    {receipt.purchaseOrderNumber}
                  </td>
                  <td className="px-2 py-2">{receipt.warehouseName}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {receipt.itemCount}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {formatRelativeTime(new Date(receipt.receivedAt))}
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

export function RecentAdjustmentsTable({
  adjustments,
}: {
  adjustments: RecentAdjustmentActivity[]
}) {
  if (adjustments.length === 0) {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Ajustes de stock recientes</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Ajuste #</th>
                <th className="px-2 py-2 font-medium">Tipo</th>
                <th className="px-2 py-2 font-medium">Almacén</th>
                <th className="px-2 py-2 text-right font-medium">Líneas</th>
                <th className="px-4 py-2 text-right font-medium">Creado</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adjustment) => (
                <tr
                  key={adjustment.id}
                  className="border-b last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/inventory/adjustments/${adjustment.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {adjustment.documentNumber}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    {adjustmentTypeLabel(adjustment.adjustmentType)}
                  </td>
                  <td className="px-2 py-2">{adjustment.warehouseName}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {adjustment.itemCount}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {formatRelativeTime(new Date(adjustment.createdAt))}
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

type RecentReturnsTableProps = {
  returns: RecentReturnActivity[]
}

export function RecentReturnsTable({ returns }: RecentReturnsTableProps) {
  if (returns.length === 0) {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Devoluciones recientes</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Devolución #</th>
                <th className="px-2 py-2 font-medium">Venta</th>
                <th className="px-2 py-2 text-right font-medium">Cant.</th>
                <th className="hidden px-2 py-2 font-medium md:table-cell">
                  Motivo
                </th>
                <th className="px-4 py-2 text-right font-medium">Hora</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2">
                    <Link
                      href={`/returns/${item.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {item.documentNumber}
                    </Link>
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">
                    {item.saleDocumentNumber}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {item.totalQuantity}
                  </td>
                  <td className="hidden max-w-[180px] truncate px-2 py-2 md:table-cell">
                    {item.reason}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {formatRelativeTime(new Date(item.createdAt))}
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
