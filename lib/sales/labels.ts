import type { SaleStatus } from "@/types/sales"

export const saleStatusLabels: Record<SaleStatus, string> = {
  draft: "Draft",
  completed: "Completed",
  cancelled: "Cancelled",
  partially_returned: "Partially returned",
  fully_returned: "Fully returned",
}
