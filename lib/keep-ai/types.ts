export type KeepAiMessageRole = "user" | "assistant"

export type KeepAiIntent =
  | "stock_query"
  | "low_stock"
  | "out_of_stock"
  | "sales_today"
  | "month_profit"
  | "search_product"
  | "pending_purchases"
  | "list_inventory"
  | "navigate"
  | "unknown"

export type KeepAiPreparedAction = {
  type:
    | "create_product"
    | "receive_purchase"
    | "stock_adjustment"
    | "create_sale"
    | "process_return"
  title: string
  summary: string
  payload: Record<string, unknown>
}

export type KeepAiResponse = {
  intent: KeepAiIntent
  message: string
  links?: Array<{ label: string; href: string }>
  preparedAction?: KeepAiPreparedAction
  denied?: boolean
  clarificationOptions?: string[]
  provider?: "llm" | "fallback"
}

export type KeepAiConversationMessage = {
  role: "user" | "assistant"
  content: string
}

export type KeepAiToolResult = {
  toolName: string
  success: boolean
  data?: unknown
  error?: string
  denied?: boolean
}
