import {
  detectFallbackTool,
  runKeepAiFallback,
} from "@/lib/keep-ai/fallback"
import { canViewProductCosts } from "@/lib/auth/permissions"
import type { KeepAiConversationMessage, KeepAiResponse } from "@/lib/keep-ai/types"
import type { AuthenticatedUser } from "@/lib/auth/types"
import { executeKeepAiToolStub } from "@/lib/keep-ai/testing/stub-executor"

const HALLUCINATION_PATTERN =
  /PlayStation|PS5|PSP|IP16|\$\d|PO-\d|7 uds|11999|9000 MXN/i

async function formatStubResponse(
  user: AuthenticatedUser,
  tool: string,
  args: Record<string, unknown>,
  intent: KeepAiResponse["intent"]
): Promise<KeepAiResponse & { preparedAction?: KeepAiResponse["preparedAction"] }> {
  if (tool === "unknown") {
    return {
      intent: "unknown",
      message:
        "Solo puedo ayudarte con operaciones de Keep Inventory: inventario, ventas, compras, productos y configuración operativa.",
    }
  }

  if (tool === "rejectDangerous") {
    return {
      intent: "unknown",
      message:
        "No puedo ejecutar esa acción. Las operaciones destructivas o de permisos requieren confirmación explícita y autorización del sistema.",
      denied: true,
    }
  }

  if (tool === "requestClarification") {
    return {
      intent: "unknown",
      message:
        "Necesito más detalles para continuar. Indica producto, cantidad, almacén, cliente o proveedor según corresponda.",
      clarificationOptions: ["Producto y SKU", "Cantidad", "Almacén", "Cliente o proveedor"],
    }
  }

  if (tool === "cancelDraft") {
    return { intent: "unknown", message: "Acción pendiente cancelada. No se realizó ningún cambio." }
  }

  if (tool === "updateDraft") {
    return {
      intent: "unknown",
      message: `Actualicé el borrador pendiente${args.quantity ? ` a ${args.quantity} unidades` : ""}. Confirma para aplicar.`,
      preparedAction: {
        type: "stock_adjustment",
        title: "Actualizar borrador",
        summary: "Borrador actualizado",
        payload: args,
      },
    }
  }

  const result = await executeKeepAiToolStub(user, tool, args)

  if (result.denied) {
    return {
      intent,
      message: result.error ?? "No tienes permiso para consultar esta información.",
      denied: true,
    }
  }

  if (result.preparedAction) {
    const action = result.preparedAction
    return {
      intent,
      message: "Preparé un borrador. Revisa los datos y confirma antes de aplicar cualquier cambio.",
      preparedAction: {
        type: mapStubDraftType(action.type),
        title: action.title,
        summary: action.summary,
        payload: action.payload,
      },
    }
  }

  if (tool === "getProductStock" || tool === "searchProducts") {
    const matches = (result.data?.matches as Array<Record<string, unknown>>) ?? []
    if (matches.length === 0) {
      return {
        intent: "stock_query",
        message: `No encontré productos para "${result.data?.query ?? "tu consulta"}".`,
      }
    }
    if (matches.length > 1 || result.data?.ambiguous) {
      const options = matches.slice(0, 5).map((item) => `${item.product_name} (${item.sku})`)
      return {
        intent: "stock_query",
        message: `Encontré varios productos. ¿Cuál quieres consultar?\n${options.join("\n")}`,
        clarificationOptions: options,
      }
    }
    const item = matches[0]
    const lines = [`${item.product_name} (${item.sku}): ${item.quantity_on_hand} uds.`]
    if (canViewProductCosts(user) && item.cost_price != null) {
      lines.push(`Costo: ${item.cost_price} MXN`)
    }
    if (item.sale_price != null) {
      lines.push(`Precio: ${item.sale_price} MXN`)
    }
    return { intent: "stock_query", message: lines.join("\n") }
  }

  if (
    tool === "adjustStockDraft" ||
    tool === "receivePurchaseDraft" ||
    tool === "createSaleDraft" ||
    tool === "returnDraft"
  ) {
    if (result.data?.needsClarification) {
      const matches = (result.data.matches as Array<Record<string, unknown>>) ?? []
      const options = matches.map((item) => `${item.product_name} (${item.sku})`)
      return {
        intent,
        message: "Encontré varios productos. ¿Cuál quieres usar?",
        clarificationOptions: options,
      }
    }
  }

  if (tool === "listInventory") {
    const items = (result.data?.items as Array<Record<string, unknown>>) ?? []
    if (items.length === 0) {
      return { intent: "list_inventory", message: "No hay productos con existencias registradas." }
    }
    const summary = items
      .map((item) => `${item.product_name} (${item.sku}): ${item.quantity_on_hand} uds.`)
      .join("\n")
    return { intent: "list_inventory", message: `Productos con existencias:\n${summary}` }
  }

  return { intent, message: `[evaluación offline · ${tool}]` }
}

export async function runKeepAiFallbackOffline(
  user: AuthenticatedUser,
  message: string,
  history: KeepAiConversationMessage[] = []
) {
  const { tool, args, intent } = detectFallbackTool(message, history)

  const draftTools = [
    "adjustStockDraft",
    "receivePurchaseDraft",
    "createSaleDraft",
    "returnDraft",
  ]

  if (draftTools.includes(tool)) {
    if (
      !user.aiAllowPrepare ||
      (!hasAdjustPermission(user))
    ) {
      return {
        intent: "unknown" as const,
        message: "No tienes permiso para preparar esta operación.",
        denied: true,
      }
    }
  }

  return formatStubResponse(user, tool, args, intent)
}

function hasAdjustPermission(user: AuthenticatedUser): boolean {
  return user.permissions.some(
    (p) =>
      (p.resource === "inventory" && p.action === "adjust") ||
      (p.resource === "sales" && p.action === "create") ||
      (p.resource === "purchases" && p.action === "receive")
  )
}

export { HALLUCINATION_PATTERN }

function mapStubDraftType(type: string): "create_product" | "receive_purchase" | "stock_adjustment" | "create_sale" | "process_return" {
  if (type === "create_product") return "create_product"
  if (type === "receive_purchase" || type === "receivePurchase") return "receive_purchase"
  if (type === "create_sale" || type === "createSale") return "create_sale"
  if (type === "process_return" || type === "return") return "process_return"
  return "stock_adjustment"
}
