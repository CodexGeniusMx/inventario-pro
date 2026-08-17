import type { PurchaseOrderStatus } from "@/types/purchasing"

import { Badge } from "@/components/ui/badge"
import { purchaseOrderStatusLabels } from "@/lib/purchasing/labels"

type PurchaseStatusBadgeProps = {
  status: PurchaseOrderStatus
}

const statusVariants: Record<
  PurchaseOrderStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  ordered: "default",
  partially_received: "outline",
  received: "default",
  cancelled: "destructive",
}

export function PurchaseStatusBadge({ status }: PurchaseStatusBadgeProps) {
  return (
    <Badge variant={statusVariants[status]}>
      {purchaseOrderStatusLabels[status]}
    </Badge>
  )
}
