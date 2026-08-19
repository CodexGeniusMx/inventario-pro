import type { Json } from "@/lib/database.types"

export type ReceivePurchaseRpcArgs = {
  p_organization_id: string
  p_purchase_order_id: string
  p_created_by: string
  p_lines: Json
  p_notes?: string
  p_idempotency_key?: string
}

export type CreatePurchaseOrderRpcArgs = {
  p_organization_id: string
  p_supplier_id: string
  p_warehouse_id: string
  p_created_by?: string | null
  p_lines: Json
  p_notes?: string | null
  p_currency_code?: string
  p_idempotency_key?: string
}
