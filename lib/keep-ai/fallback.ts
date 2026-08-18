import type { AuthenticatedUser } from "@/lib/auth/types"
import { canViewProductCosts, hasPermission } from "@/lib/auth/permissions"
import { executeKeepAiTool } from "@/lib/keep-ai/tools/executor"
import type {
  KeepAiConversationMessage,
  KeepAiIntent,
  KeepAiPreparedAction,
  KeepAiResponse,
} from "@/lib/keep-ai/types"

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

export function resolveProductFromContext(
  message: string,
  history: KeepAiConversationMessage[]
): string | null {
  const normalized = normalize(message)

  const switchMatch = normalized.match(
    /(?:ahora busca|busca el|busca la|busca|cambia a|consulta el|consulta la|consulta)\s+(.+)/
  )
  if (switchMatch?.[1]) {
    return switchMatch[1].replace(/\?/g, "").trim()
  }

  const followUp =
    /^(y |)(cuanto|cuesta|cuestan|precio|precios|ventas|stock|existencias|mas info|cuantos|cuantas|quedan|vendimos)/.test(
      normalized
    )

  if (!followUp) return null

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index]
    if (entry.role === "assistant") {
      const match = entry.content.match(/([A-Za-zÁÉÍÓÚáéíóú0-9][^(\n:]+)\s*\(/)
      if (match?.[1]) {
        return match[1].trim()
      }
    }

    if (entry.role === "user") {
      const productMatch = entry.content.match(
        /(?:cuantos|cuantas|hay|stock(?: del| de)?|todavia tenemos|cuanto queda de)\s+(?:la |el |de )?(.+?)(?:\?|$)/i
      )
      if (productMatch?.[1]) {
        return productMatch[1].replace(/\?/g, "").trim()
      }
    }
  }

  return null
}

export function resolveSupplierFromContext(
  message: string,
  history: KeepAiConversationMessage[]
): string | null {
  const normalized = normalize(message)

  if (!/faltan por recibir|pendientes|ultima|última|cuanto fue/.test(normalized)) {
    return null
  }

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index]
    if (entry.role === "assistant") {
      const supplierInAssistant = entry.content.match(/·\s*([^·]+)\s*·/)
      if (supplierInAssistant?.[1]) {
        return supplierInAssistant[1].trim()
      }
    }

    if (entry.role !== "user") continue

    const supplierMatch = entry.content.match(
      /(?:compras de|pedidos de|proveedor)\s+([a-zA-ZÁÉÍÓÚáéíóú0-9\s]+)/i
    )
    if (supplierMatch?.[1]) {
      return supplierMatch[1].trim()
    }
  }

  return null
}

export function detectFallbackTool(
  message: string,
  history: KeepAiConversationMessage[] = []
): { tool: string; args: Record<string, unknown>; intent: KeepAiIntent } {
  const text = normalize(message)
  const contextualProduct = resolveProductFromContext(message, history)
  const contextualSupplier = resolveSupplierFromContext(message, history)

  if (
    /clima|chiste|cuentame un chiste|cuéntame un chiste|dieta|partido|gano el|ganó el|ignora mis permisos|quien gano|quién ganó/.test(
      text
    )
  ) {
    return { tool: "unknown", args: {}, intent: "unknown" }
  }

  if (
    /borra todos|elimina todos|stock en cero|pon todo el stock|hazme administrador|acceso total a todos|ignora mis permisos|muéstrame las ganancias aunque no tenga|muestrame las ganancias aunque no tenga/.test(
      text
    )
  ) {
    return { tool: "rejectDangerous", args: { reason: message }, intent: "unknown" }
  }

  if (/^cancela|^olvida|^descarta|cancelar todo/.test(text)) {
    return { tool: "cancelDraft", args: {}, intent: "unknown" }
  }

  if (/no,? mejor|cambia a|actualiza a|mejor \d+/.test(text)) {
    const qtyMatch = text.match(/(\d+)/)
    return {
      tool: "updateDraft",
      args: { quantity: qtyMatch ? Number(qtyMatch[1]) : undefined },
      intent: "unknown",
    }
  }

  if (
    /^agrega un producto$|^mete 10 unidades$|^recibimos mercancia$|^recibimos mercancía$|^haz una venta$|^agrega un producto\s*$|^mete unidades$/.test(
      text
    ) ||
    (/^agrega un producto|^mete \d+ unidades$|^recibimos mercancia|^haz una venta/.test(text) &&
      !/ps5|iphone|play|sku|sony|apple/.test(text))
  ) {
    return {
      tool: "requestClarification",
      args: { topic: message },
      intent: "unknown",
    }
  }

  if (/utilidad|margen|ganancia|profit|ganamos este mes|como vamos de ventas este mes|ganamos hoy|cuanto ganamos/.test(text)) {
    return { tool: "getSalesSummary", args: {}, intent: "month_profit" }
  }

  if (
    /ventas de hoy|vendimos hoy|como vamos de ventas hoy|dinero entro|dinero entró|cuanto dinero|q se vendio|se vendio oi|ventas d oi|ventas del dia|ventas del día|se vendio hoy|vendio hoy|ingresos de hoy|ingresos hoy/.test(
      text
    )
  ) {
    return { tool: "getSalesToday", args: {}, intent: "sales_today" }
  }

  if (/sin stock|agotado|out of stock|que esta agotado|qué está agotado|productos agotados/.test(text)) {
    return { tool: "getOutOfStock", args: {}, intent: "out_of_stock" }
  }

  if (
    /stock bajo|bajo stock|reorden|casi se nos acaban|ya casi se|volver a pedir|debemos pedir|por reordenar|faltan pocas unidades|productos con poco stock|poco stock/.test(
      text
    )
  ) {
    return { tool: "getLowStock", args: {}, intent: "low_stock" }
  }

  if (
    /compras.*pendientes|pendientes.*compras|faltan por llegar|falta por recibir|pedidos no han llegado|pendiente.*recibir|compras pendietes|q falta x recibir|que falta x recibir|que llego hoy|qué llegó hoy|que llego|pedidos pendientes|ultima cuanto fue|última cuánto fue|cuales faltan por recibir|cuáles faltan por recibir/.test(
      text
    )
  ) {
    return {
      tool: "getPendingPurchases",
      args: contextualSupplier ? { supplier: contextualSupplier } : {},
      intent: "pending_purchases",
    }
  }

  if (
    /que productos tenemos|qué tenemos en inventario|que hay|que tenemos a la venta|que productos hay|inventario disponible|ke productos tenemos|muéstrame lo que hay|que hay en stock|q tenemos|qué hay|qué productos quedan|que productos quedan|enseñame el inventario|ensename el inventario|muestrame el inventario|muéstrame el inventario|q ai en stok|que ai en stok|ke hay en stok|listado de inventario|ver inventario completo/.test(
      text
    )
  ) {
    return { tool: "listInventory", args: { limit: 15 }, intent: "list_inventory" }
  }

  if (/devuelve \d+|devolver \d+|hacer devolucion|hacer devolución/.test(text)) {
    const qtyMatch = text.match(/(\d+)/)
    const productMatch = text.match(/(?:de |del )?([a-z0-9\s]+)$/i)
    return {
      tool: "returnDraft",
      args: {
        quantity: qtyMatch ? Number(qtyMatch[1]) : undefined,
        query: productMatch?.[1]?.trim(),
      },
      intent: "unknown",
    }
  }

  if (/vende \d+|registra una venta de \d+|vender \d+/.test(text)) {
    const qtyMatch = text.match(/(\d+)/)
    const productMatch = text.match(/(?:de |del )?([a-z0-9\s]+)$/i)
    return {
      tool: "createSaleDraft",
      args: {
        quantity: qtyMatch ? Number(qtyMatch[1]) : undefined,
        query: productMatch?.[1]?.trim(),
      },
      intent: "unknown",
    }
  }

  if (/recibimos \d+|recibir \d+|entrada de \d+/.test(text)) {
    const qtyMatch = text.match(/(\d+)/)
    const supplierMatch = text.match(/(?:de |del )([a-z0-9\s]+)$/i)
    return {
      tool: "receivePurchaseDraft",
      args: {
        quantity: qtyMatch ? Number(qtyMatch[1]) : undefined,
        supplier: supplierMatch?.[1]?.trim(),
        query: text,
      },
      intent: "unknown",
    }
  }

  if (/ajusta el stock|ajustar stock|pon el stock en|stock a \d+/.test(text)) {
    const qtyMatch = text.match(/(\d+)/)
    const productMatch = text.match(/(?:de |del )?([a-z0-9\s]+?)(?: a | en |$)/i)
    return {
      tool: "adjustStockDraft",
      args: {
        quantity: qtyMatch ? Number(qtyMatch[1]) : undefined,
        query: productMatch?.[1]?.trim(),
      },
      intent: "unknown",
    }
  }

  if (/agrega \d+|mete \d+|suma \d+/.test(text) && /apple|manzana/.test(text)) {
    return {
      tool: "getProductStock",
      args: { query: "apple" },
      intent: "stock_query",
    }
  }

  if (/agrega \d+|mete \d+|suma \d+/.test(text) && /ps5|iphone|play|producto|unidades/.test(text)) {
    const qtyMatch = text.match(/(\d+)/)
    const name = message
      .replace(/agrega|agregar|mete|suma|\d+|unidades|uds|de/gi, "")
      .trim()
    return {
      tool: "adjustStockDraft",
      args: { quantity: qtyMatch ? Number(qtyMatch[1]) : undefined, query: name || text },
      intent: "unknown",
    }
  }

  if (/agrega|agregar|crear|nuevo producto|mete /.test(text)) {
    const name = message.replace(/agrega|agregar|crear|nuevo producto|mete/gi, "").trim()
    const skuMatch = message.match(/sku\s+([A-Z0-9-]+)/i)
    const priceMatch = message.match(/precio\s+(\d+)/i)
    return {
      tool: "createProductDraft",
      args: {
        name,
        sku: skuMatch?.[1],
        salePrice: priceMatch ? Number(priceMatch[1]) : undefined,
      },
      intent: "unknown",
    }
  }

  if (/^busca producto|^buscar producto|^buscar sku|^busca sku/.test(text)) {
    const query = text
      .replace(/^(busca producto|buscar producto|busca sku|buscar sku)\s*/g, "")
      .trim()
    return {
      tool: "searchProducts",
      args: { query: query || message },
      intent: "search_product",
    }
  }

  const productQuery =
    contextualProduct ??
    text
      .replace(/^(cuantos|cuantas|hay|stock del|stock de|stock de la|existencias de|busca|buscar|cuanto queda de|cuanto kedan del)\s+/g, "")
      .replace(/\?/g, "")
      .trim()

  if (
    productQuery &&
    /cuantos|cuantas|hay|stock|existencias|ps5|play|pley|producto|sku|barcode|cuanto cuestan|precio|queda|quedan|kedan|todavia tenemos|todavía tenemos|cuanto nos cuesta|cuanto cuesta|costo del|costo de/.test(
      text
    )
  ) {
    return {
      tool: "getProductStock",
      args: {
        query: productQuery,
        includeCost: /cuesta|costo|costar|nos cuesta/.test(text),
      },
      intent: "stock_query",
    }
  }

  if (/busca|producto|sku|cliente|proveedor/.test(text)) {
    if (/cliente/.test(text)) {
      return {
        tool: "searchCustomers",
        args: { query: productQuery || message },
        intent: "search_product",
      }
    }
    if (/proveedor|sony|mexico|méxico/.test(text)) {
      return {
        tool: "searchSuppliers",
        args: { query: contextualSupplier || productQuery || message },
        intent: "search_product",
      }
    }
    return {
      tool: "searchProducts",
      args: { query: productQuery || message },
      intent: "search_product",
    }
  }

  if (/compras de|pedidos de/.test(text)) {
    const supplierMatch = text.match(/(?:compras de|pedidos de)\s+(.+)/)
    return {
      tool: "getPendingPurchases",
      args: { supplier: supplierMatch?.[1]?.trim() },
      intent: "pending_purchases",
    }
  }

  return { tool: "listInventory", args: { limit: 10 }, intent: "list_inventory" }
}

function formatToolResult(
  user: AuthenticatedUser,
  toolName: string,
  data: unknown,
  denied?: boolean,
  error?: string
): KeepAiResponse {
  if (denied) {
    return {
      intent: "unknown",
      message: error ?? "Entendí tu solicitud, pero no tienes permiso para consultarla.",
      denied: true,
    }
  }

  if (error) {
    return { intent: "unknown", message: error }
  }

  const payload = data as Record<string, unknown>

  if (toolName === "listInventory") {
    const items = (payload.items as Array<Record<string, unknown>>) ?? []
    if (items.length === 0) {
      return {
        intent: "list_inventory",
        message: "No hay productos con existencias registradas.",
        links: [{ label: "Ver inventario", href: "/inventory" }],
      }
    }

    const summary = items
      .slice(0, 8)
      .map(
        (item) =>
          `${item.product_name} ${item.variant_name ?? ""} (${item.sku}): ${item.quantity_on_hand} uds.`
      )
      .join("\n")

    return {
      intent: "list_inventory",
      message: `Productos con existencias (${payload.totalWithStock ?? items.length} en total):\n${summary}`,
      links: [{ label: "Ver inventario", href: "/inventory" }],
    }
  }

  if (toolName === "getProductStock" || toolName === "searchProducts") {
    const matches = (payload.matches as Array<Record<string, unknown>>) ?? []
    if (matches.length === 0) {
      return {
        intent: "stock_query",
        message: `No encontré productos para "${payload.query ?? "tu consulta"}".`,
      }
    }

    if (matches.length > 1 || payload.ambiguous) {
      const options = matches
        .slice(0, 5)
        .map((item) => `${item.product_name} (${item.sku})`)
      return {
        intent: "stock_query",
        message: `Encontré varios productos. ¿Cuál quieres consultar?\n${options.join("\n")}`,
        clarificationOptions: options,
      }
    }

    const item = matches[0]
    const lines = [
      `${item.product_name} ${item.variant_name ?? ""} (${item.sku}): ${item.quantity_on_hand} uds.`,
    ]

    if (canViewProductCosts(user) && item.cost_price != null) {
      lines.push(
        `Costo: ${Number(item.cost_price).toLocaleString("es-MX", {
          style: "currency",
          currency: user.organizationBaseCurrency,
        })} ${user.organizationBaseCurrency}`
      )
    }

    if (item.sale_price != null) {
      lines.push(
        `Precio: ${Number(item.sale_price).toLocaleString("es-MX", {
          style: "currency",
          currency: user.organizationBaseCurrency,
        })} ${user.organizationBaseCurrency}`
      )
    }

    return {
      intent: "stock_query",
      message: lines.join("\n"),
      links: [{ label: "Ver inventario", href: "/inventory" }],
    }
  }

  if (toolName === "getLowStock" || toolName === "getOutOfStock") {
    const items = (payload.items as Array<Record<string, unknown>>) ?? []
    if (items.length === 0) {
      return {
        intent: toolName === "getOutOfStock" ? "out_of_stock" : "low_stock",
        message:
          toolName === "getOutOfStock"
            ? "No hay productos sin stock."
            : "No hay productos con stock bajo.",
      }
    }

    return {
      intent: toolName === "getOutOfStock" ? "out_of_stock" : "low_stock",
      message: items
        .map(
          (item) =>
            `${item.product_name} (${item.sku}): ${item.quantity_on_hand} uds.`
        )
        .join("\n"),
      links: [{ label: "Ver inventario", href: "/inventory" }],
    }
  }

  if (toolName === "getSalesToday") {
    const revenue =
      payload.revenueToday == null
        ? null
        : Number(payload.revenueToday).toLocaleString("es-MX", {
            style: "currency",
            currency: String(payload.currency ?? user.organizationBaseCurrency),
          })

    return {
      intent: "sales_today",
      message: revenue
        ? `Ventas completadas hoy: ${payload.salesCount}. Ingresos: ${revenue} ${payload.currency}.`
        : `Ventas completadas hoy: ${payload.salesCount}.`,
      links: [{ label: "Ver ventas", href: "/sales" }],
    }
  }

  if (toolName === "getSalesSummary") {
    return {
      intent: "month_profit",
      message: `Ventas del mes: ${payload.salesCount}. Ingresos netos: ${Number(payload.netRevenue).toLocaleString("es-MX", { style: "currency", currency: String(payload.currency) })}. Utilidad bruta estimada: ${Number(payload.estimatedGrossProfit).toLocaleString("es-MX", { style: "currency", currency: String(payload.currency) })}.`,
      links: [{ label: "Ver reportes", href: "/reports/sales" }],
    }
  }

  if (toolName === "getPendingPurchases") {
    const items = (payload.items as Array<Record<string, unknown>>) ?? []
    if (items.length === 0) {
      return { intent: "pending_purchases", message: "No hay compras pendientes de recibir." }
    }

    return {
      intent: "pending_purchases",
      message: items
        .map((item) => {
          const supplier = item.suppliers as { name: string } | null
          return `${item.document_number} · ${supplier?.name ?? "Proveedor"} · ${Number(item.total).toLocaleString("es-MX", { style: "currency", currency: String(item.currency_code ?? user.organizationBaseCurrency) })}`
        })
        .join("\n"),
      links: [{ label: "Ver compras", href: "/purchases" }],
    }
  }

  return {
    intent: "unknown",
    message: "Puedo ayudarte con inventario, ventas, compras y productos.",
    links: [
      { label: "Panel", href: "/dashboard" },
      { label: "Inventario", href: "/inventory" },
    ],
  }
}

export async function runKeepAiFallback(
  user: AuthenticatedUser,
  message: string,
  history: KeepAiConversationMessage[] = []
): Promise<KeepAiResponse & { preparedAction?: KeepAiPreparedAction }> {
  const { tool, args, intent } = detectFallbackTool(message, history)

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
      clarificationOptions: [
        "Producto y SKU",
        "Cantidad",
        "Almacén",
        "Cliente o proveedor",
      ],
    }
  }

  if (tool === "cancelDraft") {
    return {
      intent: "unknown",
      message: "Acción pendiente cancelada. No se realizó ningún cambio.",
    }
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

  const draftTools = [
    "adjustStockDraft",
    "receivePurchaseDraft",
    "createSaleDraft",
    "returnDraft",
  ]

  if (draftTools.includes(tool)) {
    if (
      !user.aiAllowPrepare ||
      (!hasPermission(user, "inventory", "adjust") &&
        !hasPermission(user, "sales", "create") &&
        !hasPermission(user, "purchases", "receive"))
    ) {
      return {
        intent: "unknown",
        message: "No tienes permiso para preparar esta operación.",
        denied: true,
      }
    }

    return {
      intent,
      message:
        "Preparé un borrador. Revisa los datos y confirma antes de aplicar cualquier cambio.",
      preparedAction: {
        type: mapDraftToolType(tool),
        title: "Operación pendiente",
        summary: message,
        payload: args,
      },
      links: [{ label: "Ver inventario", href: "/inventory" }],
    }
  }

  const result = await executeKeepAiTool(user, tool, args)

  if (result.preparedAction) {
    return {
      intent,
      message:
        "Preparé un borrador. Revisa los datos y confirma antes de crear el producto.",
      preparedAction: result.preparedAction,
      links: [{ label: "Nuevo producto", href: "/products/new" }],
    }
  }

  const formatted = formatToolResult(
    user,
    tool,
    result.data,
    result.denied,
    result.error
  )

  return { ...formatted, intent: formatted.intent ?? intent }
}

function mapDraftToolType(tool: string): KeepAiPreparedAction["type"] {
  switch (tool) {
    case "receivePurchaseDraft":
      return "receive_purchase"
    case "createSaleDraft":
      return "create_sale"
    case "returnDraft":
      return "process_return"
    default:
      return "stock_adjustment"
  }
}
