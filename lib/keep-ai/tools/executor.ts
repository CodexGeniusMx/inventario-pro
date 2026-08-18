import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  canViewFinancialProfit,
  canViewProductCosts,
  hasPermission,
} from "@/lib/auth/permissions"
import type { KeepAiPreparedAction, KeepAiToolResult } from "@/lib/keep-ai/types"
import { createClient } from "@/lib/supabase/server"

type ToolArgs = Record<string, unknown>

function normalizeSearchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
}

function buildProductSearchFilter(query: string): string {
  const terms = normalizeSearchTerms(query)
  if (terms.length === 0) {
    return `product_name.ilike.%${query}%,sku.ilike.%${query}%,variant_name.ilike.%${query}%`
  }

  const clauses = terms.flatMap((term) => [
    `product_name.ilike.%${term}%`,
    `sku.ilike.%${term}%`,
    `variant_name.ilike.%${term}%`,
  ])

  return clauses.join(",")
}

async function searchInventoryRows(
  user: AuthenticatedUser,
  query: string,
  limit = 8
) {
  const supabase = await createClient()
  const filter = buildProductSearchFilter(query)

  const { data, error } = await supabase
    .from("v_inventory_status")
    .select(
      "product_name, variant_name, sku, quantity_on_hand, reorder_point, sale_price, cost_price"
    )
    .eq("organization_id", user.organizationId)
    .or(filter)
    .order("quantity_on_hand", { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return data ?? []
}

function canViewInventory(user: AuthenticatedUser): boolean {
  return (
    hasPermission(user, "inventory", "view") ||
    hasPermission(user, "inventory", "read") ||
    hasPermission(user, "products", "view") ||
    hasPermission(user, "products", "read")
  )
}

export async function executeKeepAiTool(
  user: AuthenticatedUser,
  toolName: string,
  args: ToolArgs
): Promise<KeepAiToolResult & { preparedAction?: KeepAiPreparedAction }> {
  try {
    switch (toolName) {
      case "searchProducts":
        return runSearchProducts(user, args)
      case "listInventory":
        return runListInventory(user, args)
      case "getProductStock":
        return runGetProductStock(user, args)
      case "getLowStock":
        return runLowStock(user, false)
      case "getOutOfStock":
        return runLowStock(user, true)
      case "getSalesToday":
        return runSalesToday(user)
      case "getSalesSummary":
        return runSalesSummary(user)
      case "getPendingPurchases":
        return runPendingPurchases(user)
      case "searchCustomers":
        return runSearchCustomers(user, args)
      case "searchSuppliers":
        return runSearchSuppliers(user, args)
      case "createProductDraft":
        return runCreateProductDraft(user, args)
      default:
        return {
          toolName,
          success: false,
          error: `Herramienta desconocida: ${toolName}`,
        }
    }
  } catch {
    return {
      toolName,
      success: false,
      error: "No se pudo ejecutar la herramienta.",
    }
  }
}

async function runSearchProducts(
  user: AuthenticatedUser,
  args: ToolArgs
): Promise<KeepAiToolResult> {
  if (!canViewInventory(user)) {
    return {
      toolName: "searchProducts",
      success: false,
      denied: true,
      error: "No tienes permiso para consultar productos.",
    }
  }

  const query = String(args.query ?? "").trim()
  if (!query) {
    return {
      toolName: "searchProducts",
      success: false,
      error: "Indica qué producto quieres buscar.",
    }
  }

  const rows = await searchInventoryRows(user, query, 8)
  return {
    toolName: "searchProducts",
    success: true,
    data: { query, matches: rows },
  }
}

async function runListInventory(
  user: AuthenticatedUser,
  args: ToolArgs
): Promise<KeepAiToolResult> {
  if (!canViewInventory(user)) {
    return {
      toolName: "listInventory",
      success: false,
      denied: true,
      error: "No tienes permiso para consultar inventario.",
    }
  }

  const limit = Math.min(Number(args.limit ?? 15), 25)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("v_inventory_status")
    .select("product_name, variant_name, sku, quantity_on_hand")
    .eq("organization_id", user.organizationId)
    .gt("quantity_on_hand", 0)
    .order("product_name", { ascending: true })
    .limit(limit)

  if (error) {
    return { toolName: "listInventory", success: false, error: error.message }
  }

  const { count } = await supabase
    .from("v_inventory_status")
    .select("sku", { count: "exact", head: true })
    .eq("organization_id", user.organizationId)
    .gt("quantity_on_hand", 0)

  return {
    toolName: "listInventory",
    success: true,
    data: { totalWithStock: count ?? data?.length ?? 0, items: data ?? [] },
  }
}

async function runGetProductStock(
  user: AuthenticatedUser,
  args: ToolArgs
): Promise<KeepAiToolResult> {
  if (!canViewInventory(user)) {
    return {
      toolName: "getProductStock",
      success: false,
      denied: true,
      error: "No tienes permiso para consultar existencias.",
    }
  }

  const query = String(args.query ?? "").trim()
  if (!query) {
    return {
      toolName: "getProductStock",
      success: false,
      error: "Indica el producto que quieres consultar.",
    }
  }

  const rows = await searchInventoryRows(user, query, 6)

  return {
    toolName: "getProductStock",
    success: true,
    data: {
      query,
      matches: rows,
      ambiguous: rows.length > 1,
    },
  }
}

async function runLowStock(
  user: AuthenticatedUser,
  outOfStock: boolean
): Promise<KeepAiToolResult> {
  if (!canViewInventory(user)) {
    return {
      toolName: outOfStock ? "getOutOfStock" : "getLowStock",
      success: false,
      denied: true,
      error: "No tienes permiso para consultar inventario.",
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("v_inventory_status")
    .select("product_name, variant_name, sku, quantity_on_hand, reorder_point")
    .eq("organization_id", user.organizationId)
    .order("quantity_on_hand", { ascending: true })
    .limit(20)

  if (error) {
    return {
      toolName: outOfStock ? "getOutOfStock" : "getLowStock",
      success: false,
      error: error.message,
    }
  }

  const rows = (data ?? []).filter((row) => {
    if (outOfStock) return Number(row.quantity_on_hand) <= 0
    return (
      Number(row.quantity_on_hand) <= Number(row.reorder_point) &&
      Number(row.quantity_on_hand) > 0
    )
  })

  return {
    toolName: outOfStock ? "getOutOfStock" : "getLowStock",
    success: true,
    data: { items: rows.slice(0, 10) },
  }
}

async function runSalesToday(user: AuthenticatedUser): Promise<KeepAiToolResult> {
  if (
    !hasPermission(user, "sales", "view") &&
    !hasPermission(user, "sales", "read")
  ) {
    return {
      toolName: "getSalesToday",
      success: false,
      denied: true,
      error: "No tienes permiso para consultar ventas.",
    }
  }

  const supabase = await createClient()
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", user.organizationId)
    .eq("status", "completed")
    .gte("completed_at", start.toISOString())

  if (error) {
    return { toolName: "getSalesToday", success: false, error: error.message }
  }

  let revenueToday: number | null = null
  if (
    hasPermission(user, "financial", "revenue") ||
    canViewFinancialProfit(user)
  ) {
    const { data } = await supabase
      .from("sales")
      .select("total")
      .eq("organization_id", user.organizationId)
      .eq("status", "completed")
      .gte("completed_at", start.toISOString())

    revenueToday = (data ?? []).reduce((sum, row) => sum + Number(row.total), 0)
  }

  return {
    toolName: "getSalesToday",
    success: true,
    data: {
      salesCount: count ?? 0,
      revenueToday,
      currency: user.organizationBaseCurrency,
    },
  }
}

async function runSalesSummary(user: AuthenticatedUser): Promise<KeepAiToolResult> {
  if (!canViewFinancialProfit(user)) {
    return {
      toolName: "getSalesSummary",
      success: false,
      denied: true,
      error: "No tienes permiso para consultar utilidad o ingresos financieros.",
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("report_sales_summary", {
    p_organization_id: user.organizationId,
    p_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    p_to: new Date().toISOString(),
  })

  if (error) {
    return { toolName: "getSalesSummary", success: false, error: error.message }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    toolName: "getSalesSummary",
    success: true,
    data: {
      salesCount: Number(row?.sales_count ?? 0),
      netRevenue: Number(row?.net_revenue ?? 0),
      estimatedGrossProfit: Number(row?.estimated_gross_profit ?? 0),
      currency: user.organizationBaseCurrency,
    },
  }
}

async function runPendingPurchases(user: AuthenticatedUser): Promise<KeepAiToolResult> {
  if (
    !hasPermission(user, "purchases", "view") &&
    !hasPermission(user, "purchases", "read")
  ) {
    return {
      toolName: "getPendingPurchases",
      success: false,
      denied: true,
      error: "No tienes permiso para consultar compras.",
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("document_number, status, total, currency_code, suppliers(name)")
    .eq("organization_id", user.organizationId)
    .in("status", ["ordered", "partially_received"])
    .order("ordered_at", { ascending: false })
    .limit(8)

  if (error) {
    return { toolName: "getPendingPurchases", success: false, error: error.message }
  }

  return {
    toolName: "getPendingPurchases",
    success: true,
    data: { items: data ?? [] },
  }
}

async function runSearchCustomers(
  user: AuthenticatedUser,
  args: ToolArgs
): Promise<KeepAiToolResult> {
  if (
    !hasPermission(user, "customers", "view") &&
    !hasPermission(user, "customers", "read")
  ) {
    return {
      toolName: "searchCustomers",
      success: false,
      denied: true,
      error: "No tienes permiso para consultar clientes.",
    }
  }

  const query = String(args.query ?? "").trim()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .eq("organization_id", user.organizationId)
    .is("deleted_at", null)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(8)

  if (error) {
    return { toolName: "searchCustomers", success: false, error: error.message }
  }

  return { toolName: "searchCustomers", success: true, data: { items: data ?? [] } }
}

async function runSearchSuppliers(
  user: AuthenticatedUser,
  args: ToolArgs
): Promise<KeepAiToolResult> {
  if (
    !hasPermission(user, "suppliers", "view") &&
    !hasPermission(user, "suppliers", "read")
  ) {
    return {
      toolName: "searchSuppliers",
      success: false,
      denied: true,
      error: "No tienes permiso para consultar proveedores.",
    }
  }

  const query = String(args.query ?? "").trim()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, email, phone")
    .eq("organization_id", user.organizationId)
    .is("deleted_at", null)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(8)

  if (error) {
    return { toolName: "searchSuppliers", success: false, error: error.message }
  }

  return { toolName: "searchSuppliers", success: true, data: { items: data ?? [] } }
}

async function runCreateProductDraft(
  user: AuthenticatedUser,
  args: ToolArgs
): Promise<KeepAiToolResult & { preparedAction?: KeepAiPreparedAction }> {
  if (
    !user.aiAllowPrepare ||
    (!hasPermission(user, "products", "create") &&
      !hasPermission(user, "products", "write"))
  ) {
    return {
      toolName: "createProductDraft",
      success: false,
      denied: true,
      error: "No tienes permiso para preparar productos.",
    }
  }

  const name = String(args.name ?? "").trim()
  if (!name) {
    return {
      toolName: "createProductDraft",
      success: false,
      error: "Indica el nombre del producto.",
    }
  }

  const preparedAction: KeepAiPreparedAction = {
    type: "create_product",
    title: "Nuevo producto",
    summary: `Preparar creación de ${name}`,
    payload: {
      name,
      sku: args.sku ? String(args.sku) : undefined,
      salePrice: args.salePrice,
      costPrice: canViewProductCosts(user) ? args.costPrice : undefined,
      currency: user.organizationBaseCurrency,
    },
  }

  return {
    toolName: "createProductDraft",
    success: true,
    data: { prepared: true },
    preparedAction,
  }
}
