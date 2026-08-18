const PURCHASE_ORDER_STATUS: Record<string, string> = {
  draft: "Borrador",
  ordered: "Ordenada",
  partially_received: "Parcialmente recibida",
  received: "Recibida",
  cancelled: "Cancelada",
}

const SALE_STATUS: Record<string, string> = {
  draft: "Borrador",
  completed: "Completada",
  cancelled: "Cancelada",
  partially_returned: "Parcialmente devuelta",
  fully_returned: "Totalmente devuelta",
}

const ADJUSTMENT_TYPE: Record<string, string> = {
  initial_stock: "Stock inicial",
  correction: "Corrección",
  damage: "Daño",
  loss: "Pérdida",
  count: "Conteo",
  other: "Otro",
}

const INVITATION_STATUS: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  expired: "Expirada",
  cancelled: "Cancelada",
}

const MOVEMENT_TYPE: Record<string, string> = {
  purchase_receipt: "Recepción de compra",
  sale: "Venta",
  return: "Devolución",
  adjustment: "Ajuste",
  transfer: "Transferencia",
}

export function purchaseOrderStatusLabel(status: string): string {
  return PURCHASE_ORDER_STATUS[status] ?? status.replaceAll("_", " ")
}

export function saleStatusLabel(status: string): string {
  return SALE_STATUS[status] ?? status.replaceAll("_", " ")
}

export function adjustmentTypeLabel(type: string): string {
  return ADJUSTMENT_TYPE[type] ?? type.replaceAll("_", " ")
}

export function invitationStatusLabel(status: string): string {
  return INVITATION_STATUS[status] ?? status.replaceAll("_", " ")
}

export function movementTypeLabel(type: string): string {
  return MOVEMENT_TYPE[type] ?? type.replaceAll("_", " ")
}
