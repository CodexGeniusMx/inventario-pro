import type { MovementType, StockAdjustmentType } from "@/types/inventory"

export const movementTypeLabels: Record<MovementType, string> = {
  initial_stock: "Initial stock",
  purchase_receipt: "Purchase receipt",
  sale: "Sale",
  sale_return: "Sale return",
  adjustment_increase: "Adjustment (+)",
  adjustment_decrease: "Adjustment (−)",
  damage: "Damage",
  loss: "Loss",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
}

export const adjustmentTypeLabels: Record<StockAdjustmentType, string> = {
  initial_stock: "Initial stock",
  increase: "Increase",
  decrease: "Decrease",
  damage: "Damaged stock",
  loss: "Lost stock",
}

export function formatSignedQuantity(quantity: number): string {
  if (quantity > 0) {
    return `+${quantity}`
  }

  return String(quantity)
}
