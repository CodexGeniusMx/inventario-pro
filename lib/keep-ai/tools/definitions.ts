import type { KeepAiConversationMessage } from "@/lib/keep-ai/types"

export type KeepAiToolDefinition = {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export const KEEP_AI_TOOL_DEFINITIONS: KeepAiToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description:
        "Busca productos por nombre, SKU o código de barras. Usar cuando el usuario pregunta por un producto específico o quiere encontrar productos.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto de búsqueda del producto" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listInventory",
      description:
        "Lista un resumen del inventario disponible: productos activos con existencias. Usar para preguntas como qué productos tenemos, qué hay en inventario o qué tenemos a la venta.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Cantidad máxima de productos a listar" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProductSalePrice",
      description:
        "Obtiene el precio de venta al cliente de un producto. Usar para preguntas como cuánto cuesta, qué precio tiene o a cuánto lo vendemos.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nombre, SKU o alias del producto" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProductAcquisitionCost",
      description:
        "Obtiene el costo de compra/adquisición de un producto. Requiere permiso de costos. Usar cuando preguntan cuánto nos cuesta o cuánto pagamos.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nombre, SKU o alias del producto" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProductProfit",
      description:
        "Calcula utilidad o margen estimado de un producto. Requiere permisos financieros y de costos.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nombre, SKU o alias del producto" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProductStock",
      description:
        "Obtiene existencias de un producto específico. Usar cuando el usuario pregunta cuántos hay de un producto concreto.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nombre, SKU o alias del producto" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getLowStock",
      description: "Lista productos con stock bajo o cerca del punto de reorden.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getOutOfStock",
      description: "Lista productos sin stock.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getSalesToday",
      description: "Resume ventas completadas de hoy.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getSalesSummary",
      description:
        "Resume ventas e ingresos del mes actual. Requiere permiso financiero para utilidad.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getPendingPurchases",
      description: "Lista compras pendientes de recibir.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "searchCustomers",
      description: "Busca clientes por nombre, correo o teléfono.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchSuppliers",
      description: "Busca proveedores por nombre, correo o teléfono.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createProductDraft",
      description:
        "Prepara un borrador para crear un producto. No ejecuta la creación; solo prepara datos para confirmación.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          sku: { type: "string" },
          salePrice: { type: "number" },
          costPrice: { type: "number" },
        },
        required: ["name"],
      },
    },
  },
]

export function buildKeepAiSystemPrompt(baseCurrency: string): string {
  return `Eres Keep AI, el asistente conversacional de Keep Inventory (CodexGenius).
Responde siempre en español, de forma clara, profesional y breve.
El usuario puede escribir con errores, sin acentos o con frases incompletas; interpreta la intención real.
Nunca inventes datos: usa herramientas para consultar información autorizada.
Si una herramienta indica falta de permiso, explica que entendiste la solicitud pero el usuario no tiene acceso.
Si hay varios productos posibles, pide aclaración en lugar de adivinar.
Para mutaciones (crear producto, recibir compra, ajustar stock), solo prepara borradores; nunca ejecutes cambios directamente.
La moneda base del catálogo es ${baseCurrency}.
Mantén contexto conversacional: referencias como "y cuánto cuestan" deben usar el producto mencionado antes.`
}

export type LlmMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: LlmToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string }

export type LlmToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export function toLlmMessages(
  systemPrompt: string,
  history: KeepAiConversationMessage[]
): LlmMessage[] {
  return [
    { role: "system", content: systemPrompt },
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ]
}
