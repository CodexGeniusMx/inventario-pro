import type { PurchaseOrderStatus } from "@/types/purchasing"

export const purchaseOrderStatusLabels: Record<PurchaseOrderStatus, string> = {
  draft: "Borrador",
  ordered: "Ordenada",
  partially_received: "Parcialmente recibida",
  received: "Recibida",
  cancelled: "Cancelada",
}
