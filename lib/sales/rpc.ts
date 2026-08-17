import type { Json } from "@/lib/database.types"

export type CreateAndCompleteSaleRpcArgs = {
  p_organization_id: string
  p_warehouse_id: string
  p_created_by: string
  p_lines: Json
  p_customer_id?: string
  p_discount_amount?: number
  p_idempotency_key?: string
  p_notes?: string
}
