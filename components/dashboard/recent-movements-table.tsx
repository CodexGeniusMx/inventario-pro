import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/format"
import type { RecentInventoryMovement } from "@/types/dashboard"

const movementLabels: Record<RecentInventoryMovement["type"], string> = {
  sale: "Venta",
  purchase_receipt: "Recepción",
  adjustment_increase: "Ajuste +",
  adjustment_decrease: "Ajuste -",
  damage: "Daño",
  loss: "Pérdida",
  sale_return: "Devolución",
  initial_stock: "Inicial",
  transfer_in: "Transferencia entrante",
  transfer_out: "Transferencia saliente",
}

const movementVariants: Record<
  RecentInventoryMovement["type"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  sale: "outline",
  purchase_receipt: "default",
  adjustment_increase: "secondary",
  adjustment_decrease: "secondary",
  damage: "destructive",
  loss: "destructive",
  sale_return: "outline",
  initial_stock: "secondary",
  transfer_in: "default",
  transfer_out: "outline",
}

type RecentMovementsTableProps = {
  movements: RecentInventoryMovement[]
}

export function RecentMovementsTable({ movements }: RecentMovementsTableProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Movimientos recientes de inventario</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-2 py-2 font-medium">Producto</th>
                <th className="hidden px-2 py-2 font-medium lg:table-cell">
                  Referencia
                </th>
                <th className="px-2 py-2 text-right font-medium">Cant.</th>
                <th className="hidden px-2 py-2 font-medium md:table-cell">
                  Usuario
                </th>
                <th className="px-4 py-2 text-right font-medium">Hora</th>
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
                    {formatRelativeTime(new Date(movement.createdAt))}
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
