import { Badge } from "@/components/ui/badge"
import { stockStatusLabels } from "@/lib/inventory/labels"
import type { StockStatus } from "@/types/inventory"
import { cn } from "@/lib/utils"

type StockStatusBadgeProps = {
  status: StockStatus
  className?: string
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
      {stockStatusLabels[status]}
    </Badge>
  )
}
