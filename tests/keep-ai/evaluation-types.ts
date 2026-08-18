export type KeepAiEvaluationMetric =
  | "intent"
  | "entity"
  | "typos"
  | "context"
  | "ambiguity"
  | "permissions"
  | "mutations"
  | "confirmation"
  | "hallucination"
  | "out-of-scope"

export type KeepAiEvaluationCase = {
  id: string
  group: string
  metric: KeepAiEvaluationMetric
  input: string
  history?: Array<{ role: "user" | "assistant"; content: string }>
  expectedTool: string
  expectedIntent?: string
  expectedEntity?: string
  permissionRole?:
    | "owner"
    | "admin"
    | "manager"
    | "seller"
    | "warehouse"
    | "read_only"
  expectDenied?: boolean
  expectClarification?: boolean
  expectPreparedAction?: boolean
  expectRejected?: boolean
  expectNoHallucination?: boolean
  expectEmptyResult?: boolean
  typoTolerance?: boolean
  baseline?: boolean
  notes?: string
}

export type KeepAiEvaluationCategory =
  | "inventario-general"
  | "stock-producto"
  | "stock-bajo"
  | "sin-stock"
  | "ventas"
  | "compras"
  | "productos"
  | "clientes"
  | "proveedores"
  | "typos"
  | "contexto"
  | "ambiguedad"
  | "permisos"
  | "mutaciones"
  | "confirmaciones"
  | "no-soportadas"
  | "anti-hallucination"

export const EVALUATION_GROUP_LABELS: Record<string, string> = {
  "inventory-list": "Inventario general",
  "product-stock": "Stock producto",
  "low-stock": "Stock bajo",
  "out-of-stock": "Sin stock",
  sales: "Ventas",
  purchases: "Compras",
  products: "Productos",
  customers: "Clientes",
  suppliers: "Proveedores",
  typos: "Typos",
  context: "Contexto",
  ambiguity: "Ambigüedad",
  permissions: "Permisos",
  mutations: "Mutaciones",
  confirmations: "Confirmaciones",
  unknown: "No soportadas",
  "anti-hallucination": "Anti-hallucination",
}
