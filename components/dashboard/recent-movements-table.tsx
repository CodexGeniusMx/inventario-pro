import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/format"
import type { InventoryMovement } from "@/lib/mock/dashboard"

const movementLabels: Record<InventoryMovement["type"], string> = {
  sale: "Sale",
  purchase_receipt: "Receipt",
  adjustment: "Adjustment",
  damage: "Damage",
  sale_return: "Return",
  initial_stock: "Initial",
}

const movementVariants: Record<
  InventoryMovement["type"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  sale: "outline",
  purchase_receipt: "default",
  adjustment: "secondary",
  damage: "destructive",
  sale_return: "outline",
  initial_stock: "secondary",
}

type RecentMovementsTableProps = {
  movements: InventoryMovement[]
}

export function RecentMovementsTable({ movements }: RecentMovementsTableProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Recent inventory movements</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-2 py-2 font-medium">Product</th>
                <th className="hidden px-2 py-2 font-medium lg:table-cell">
                  Reference
                </th>
                <th className="px-2 py-2 text-right font-medium">Qty</th>
                <th className="hidden px-2 py-2 font-medium md:table-cell">
                  User
                </th>
                <th className="px-4 py-2 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr
                  key={movement.id}
                  className="border-b last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-2">
                    <Badge variant={movementVariants[movement.type]}>
                      {movementLabels[movement.type]}
                    </Badge>
                  </td>
                  <td className="max-w-[180px] truncate px-2 py-2">
                    <span className="font-medium">{movement.product}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {movement.variant}
                    </span>
                  </td>
                  <td className="hidden px-2 py-2 font-mono text-xs lg:table-cell">
                    {movement.reference}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2 text-right font-medium tabular-nums",
                      movement.quantity > 0
                        ? "text-emerald-600"
                        : "text-destructive"
                    )}
                  >
                    {movement.quantity > 0 ? "+" : ""}
                    {movement.quantity}
                  </td>
                  <td className="hidden px-2 py-2 text-muted-foreground md:table-cell">
                    {movement.user}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {formatRelativeTime(movement.createdAt)}
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
