import Link from "next/link"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency, formatRelativeTime } from "@/lib/format"
import type { RecentPurchaseActivity, RecentReturnActivity } from "@/types/dashboard"

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
        <CardTitle>Recent purchase orders</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">PO #</th>
                <th className="px-2 py-2 font-medium">Supplier</th>
                <th className="px-2 py-2 text-right font-medium">Total</th>
                <th className="hidden px-2 py-2 font-medium md:table-cell">
                  Status
                </th>
                <th className="px-4 py-2 text-right font-medium">Updated</th>
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
                  <td className="hidden px-2 py-2 capitalize md:table-cell">
                    {purchase.status.replaceAll("_", " ")}
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
        <CardTitle>Recent returns</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Return #</th>
                <th className="px-2 py-2 font-medium">Sale</th>
                <th className="px-2 py-2 text-right font-medium">Qty</th>
                <th className="hidden px-2 py-2 font-medium md:table-cell">
                  Reason
                </th>
                <th className="px-4 py-2 text-right font-medium">Time</th>
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
