import type { SaleStatus } from "@/types/sales"

export const saleStatusLabels: Record<SaleStatus, string> = {
  draft: "Borrador",
  completed: "Completada",
  cancelled: "Cancelada",
  partially_returned: "Parcialmente devuelta",
  fully_returned: "Totalmente devuelta",
}
