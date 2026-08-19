/**
 * Permission-aware read models (views) vs authoritative write tables.
 * SELECT queries must use READ.* ; mutations use WRITE.* or table names directly.
 */
export const READ = {
  products: "v_products",
  productVariants: "v_product_variants",
  purchaseOrders: "v_purchase_orders",
  purchaseOrderItems: "v_purchase_order_items",
  purchaseReceiptItems: "v_purchase_receipt_items",
  inventoryStatus: "v_inventory_status",
  inventoryValuation: "v_inventory_valuation",
} as const

export const WRITE = {
  products: "products",
  productVariants: "product_variants",
  purchaseOrders: "purchase_orders",
  purchaseOrderItems: "purchase_order_items",
} as const
