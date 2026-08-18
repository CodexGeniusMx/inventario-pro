import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  canViewFinancialProfit,
  canViewProductCosts,
  hasPermission,
} from "@/lib/auth/permissions"

const FIXTURE = {
  ps5: {
    product_name: "PlayStation 5",
    variant_name: "",
    sku: "PS5-001",
    quantity_on_hand: 7,
    sale_price: 11999,
    cost_price: 9000,
  },
  portal: {
    product_name: "PlayStation Portal",
    variant_name: "",
    sku: "PSP-001",
    quantity_on_hand: 3,
    sale_price: 4999,
    cost_price: 3500,
  },
  iphone: {
    product_name: "iPhone 16",
    variant_name: "",
    sku: "IP16-001",
    quantity_on_hand: 4,
    sale_price: 20000,
    cost_price: 16000,
  },
  iphone15: {
    product_name: "iPhone 15",
    variant_name: "",
    sku: "IP15-001",
    quantity_on_hand: 2,
    sale_price: 18000,
    cost_price: 14000,
  },
  macbook: {
    product_name: "MacBook Air",
    variant_name: "",
    sku: "MBA-001",
    quantity_on_hand: 1,
    sale_price: 25000,
    cost_price: 20000,
  },
  appleWatch: {
    product_name: "Apple Watch",
    variant_name: "",
    sku: "AW-001",
    quantity_on_hand: 5,
    sale_price: 8000,
    cost_price: 6000,
  },
} as const

type StubToolResult = {
  toolName: string
  success: boolean
  data?: Record<string, unknown>
  denied?: boolean
  error?: string
  preparedAction?: {
    type: string
    title: string
    summary: string
    payload: Record<string, unknown>
  }
}

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function resolveProductMatches(query: string) {
  const q = normalizeQuery(query)

  if (q.includes("xyz999") || q.includes("inexistente")) {
    return []
  }

  if (q.includes("iphone")) {
    if (q.includes("16")) return [FIXTURE.iphone]
    if (q.includes("15")) return [FIXTURE.iphone15]
    return [FIXTURE.iphone, FIXTURE.iphone15]
  }

  if (q.includes("apple")) {
    return [FIXTURE.iphone, FIXTURE.iphone15, FIXTURE.macbook, FIXTURE.appleWatch]
  }

  if (
    q.includes("playstation") &&
    !q.includes("portal") &&
    !q.includes("ps5") &&
    !q.match(/\b5\b/)
  ) {
    return [FIXTURE.ps5, FIXTURE.portal]
  }

  if (q.includes("portal")) return [FIXTURE.portal]
  if (q.includes("ps5") || q.includes("play 5") || q.includes("pley") || q.includes("play")) {
    return [FIXTURE.ps5]
  }

  if (q.includes("macbook")) return [FIXTURE.macbook]

  return []
}

function canAdjust(user: AuthenticatedUser): boolean {
  return (
    hasPermission(user, "inventory", "adjust") ||
    hasPermission(user, "sales", "create") ||
    hasPermission(user, "purchases", "receive")
  )
}

export async function executeKeepAiToolStub(
  user: AuthenticatedUser,
  toolName: string,
  args: Record<string, unknown>
): Promise<StubToolResult> {
  const query = String(args.query ?? args.name ?? "")

  if (toolName === "rejectDangerous") {
    return {
      toolName,
      success: false,
      denied: true,
      error: "Operación no permitida.",
    }
  }

  if (toolName === "requestClarification") {
    return {
      toolName,
      success: false,
      error: "Necesito más detalles para continuar.",
    }
  }

  if (toolName === "cancelDraft" || toolName === "updateDraft") {
    return { toolName, success: true, data: { cancelled: toolName === "cancelDraft" } }
  }

  if (toolName === "getSalesSummary") {
    if (!canViewFinancialProfit(user)) {
      return {
        toolName,
        success: false,
        denied: true,
        error: "No tienes permiso para consultar utilidad o ingresos financieros.",
      }
    }
    return {
      toolName,
      success: true,
      data: {
        salesCount: 2,
        netRevenue: 1000,
        estimatedGrossProfit: 200,
        currency: "MXN",
      },
    }
  }

  if (toolName === "getProductStock" || toolName === "searchProducts") {
    if (args.includeCost && !canViewProductCosts(user)) {
        return {
          toolName,
          success: false,
          denied: true,
          error: "No tienes permiso para consultar costos de productos.",
      }
    }

    const matches = resolveProductMatches(query)
    return {
      toolName,
      success: true,
      data: { query, matches, ambiguous: matches.length > 1 },
    }
  }

  if (toolName === "createProductDraft") {
    if (!hasPermission(user, "products", "create")) {
      return { toolName, success: false, denied: true, error: "No tienes permiso para preparar productos." }
    }
    const name = String(args.name ?? "").trim()
    if (!name) {
      return { toolName, success: false, error: "Indica el nombre del producto." }
    }
    return {
      toolName,
      success: true,
      preparedAction: {
        type: "create_product" as const,
        title: "Nuevo producto",
        summary: `Preparar creación de ${name}`,
        payload: { name, sku: args.sku, salePrice: args.salePrice },
      },
    }
  }

  if (
    toolName === "adjustStockDraft" ||
    toolName === "receivePurchaseDraft" ||
    toolName === "createSaleDraft" ||
    toolName === "returnDraft"
  ) {
    if (!canAdjust(user)) {
      return {
        toolName,
        success: false,
        denied: true,
        error: "No tienes permiso para preparar esta operación.",
      }
    }

    const matches = resolveProductMatches(String(args.query ?? ""))
    if (matches.length > 1) {
      return {
        toolName,
        success: true,
        data: { query: args.query, matches, ambiguous: true, needsClarification: true },
      }
    }

    const draftType =
      toolName === "receivePurchaseDraft"
        ? "receive_purchase"
        : toolName === "createSaleDraft"
          ? "create_sale"
          : toolName === "returnDraft"
            ? "process_return"
            : "stock_adjustment"

    return {
      toolName,
      success: true,
      preparedAction: {
        type: draftType as "receive_purchase" | "create_sale" | "process_return" | "stock_adjustment",
        title: "Operación pendiente",
        summary: String(args.query ?? toolName),
        payload: args,
      },
    }
  }

  if (toolName === "listInventory") {
    return {
      toolName,
      success: true,
      data: {
        totalWithStock: 4,
        items: [FIXTURE.ps5, FIXTURE.portal, FIXTURE.iphone, FIXTURE.macbook],
      },
    }
  }

  if (toolName === "getLowStock") {
    return { toolName, success: true, data: { items: [FIXTURE.portal] } }
  }

  if (toolName === "getOutOfStock") {
    return { toolName, success: true, data: { items: [] } }
  }

  if (toolName === "getSalesToday") {
    return { toolName, success: true, data: { salesCount: 0, revenueToday: 0, currency: "MXN" } }
  }

  if (toolName === "getPendingPurchases") {
    const supplier = String(args.supplier ?? "").toLowerCase()
    const items = supplier.includes("sony")
      ? [{ document_number: "PO-001", total: 45000, currency_code: "MXN", suppliers: { name: "Sony México" } }]
      : [{ document_number: "PO-002", total: 12000, currency_code: "MXN", suppliers: { name: "Proveedor QA" } }]
    return { toolName, success: true, data: { items } }
  }

  if (toolName === "searchCustomers") {
    return { toolName, success: true, data: { items: [{ name: "Cliente QA", email: "qa@test.local" }] } }
  }

  if (toolName === "searchSuppliers") {
    return {
      toolName,
      success: true,
      data: { items: [{ name: "Sony México", email: "sony@test.local" }] },
    }
  }

  return { toolName, success: true, data: { items: [], matches: [] } }
}

export { FIXTURE as KEEP_AI_STUB_FIXTURE }
