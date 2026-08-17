import type { Json } from "@/lib/database.types"

export type ProcessReturnRpcArgs = {
  p_organization_id: string
  p_sale_id: string
  p_created_by: string
  p_lines: Json
  p_reason: string
  p_notes?: string
  p_idempotency_key?: string
}
