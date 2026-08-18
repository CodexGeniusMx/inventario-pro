export type GlobalSearchResultType =
  | "product"
  | "customer"
  | "supplier"
  | "purchase"
  | "sale"

export type GlobalSearchResult = {
  id: string
  type: GlobalSearchResultType
  title: string
  subtitle: string
  href: string
}

const TYPE_LABELS: Record<GlobalSearchResultType, string> = {
  product: "Producto",
  customer: "Cliente",
  supplier: "Proveedor",
  purchase: "Compra",
  sale: "Venta",
}

export function globalSearchTypeLabel(type: GlobalSearchResultType): string {
  return TYPE_LABELS[type]
}
