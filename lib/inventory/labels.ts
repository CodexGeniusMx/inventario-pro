import type { MovementType, StockAdjustmentType, StockStatus } from "@/types/inventory"

export const stockStatusLabels: Record<StockStatus, string> = {
  in_stock: "En stock",
  low_stock: "Stock bajo",
  out_of_stock: "Sin stock",
}

export const movementTypeLabels: Record<MovementType, string> = {
  initial_stock: "Stock inicial",
  purchase_receipt: "Recepción de compra",
  sale: "Venta",
  sale_return: "Devolución",
  adjustment_increase: "Ajuste de entrada",
  adjustment_decrease: "Ajuste de salida",
  damage: "Daño",
  loss: "Pérdida",
  transfer_in: "Transferencia entrante",
  transfer_out: "Transferencia saliente",
}

export function formatMovementTypeLabel(type: string): string {
  return (
    movementTypeLabels[type as MovementType] ??
    type.replace(/_/g, " ")
  )
}

export const adjustmentTypeLabels: Record<StockAdjustmentType, string> = {
  initial_stock: "Stock inicial",
  increase: "Incremento",
  decrease: "Decremento",
  damage: "Stock dañado",
  loss: "Stock perdido",
}

export function formatSignedQuantity(quantity: number): string {
  if (quantity > 0) {
    return `+${quantity}`
  }

  return String(quantity)
}
