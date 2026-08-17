import type { SaleStatus } from "@/types/sales"

import { Badge } from "@/components/ui/badge"
import { saleStatusLabels } from "@/lib/sales/labels"

type SaleStatusBadgeProps = {
  status: SaleStatus
}

const statusVariants: Record<
  SaleStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  completed: "default",
  cancelled: "destructive",
  partially_returned: "outline",
  fully_returned: "outline",
}

export function SaleStatusBadge({ status }: SaleStatusBadgeProps) {
  return (
    <Badge variant={statusVariants[status]}>
      {saleStatusLabels[status]}
    </Badge>
  )
}
