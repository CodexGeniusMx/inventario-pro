import { Badge } from "@/components/ui/badge"
import type { StockStatus } from "@/types/inventory"
import { cn } from "@/lib/utils"

type StockStatusBadgeProps = {
  status: StockStatus
  className?: string
}

const labels: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
}

export function StockStatusBadge({ status, className }: StockStatusBadgeProps) {
  return (
    <Badge
      variant={
        status === "in_stock"
          ? "secondary"
          : status === "low_stock"
            ? "outline"
            : "destructive"
      }
      className={cn(className)}
    >
      {labels[status]}
    </Badge>
  )
}
