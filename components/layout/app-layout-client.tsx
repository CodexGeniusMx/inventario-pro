"use client"

import { usePathname } from "next/navigation"

import { AppShell } from "@/components/layout/app-shell"
import type { AuthenticatedUser } from "@/lib/auth/types"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/products/new": "New product",
  "/inventory": "Inventory",
  "/inventory/movements": "Movements",
  "/inventory/adjustments": "Adjustments",
  "/inventory/adjustments/new": "New adjustment",
  "/inventory/warehouses": "Warehouses",
  "/inventory/warehouses/new": "New warehouse",
  "/purchases": "Purchases",
  "/purchases/new": "New purchase",
  "/sales": "Sales",
  "/sales/new": "New sale",
  "/returns": "Returns",
  "/customers": "Customers",
  "/customers/new": "New customer",
  "/suppliers": "Suppliers",
  "/suppliers/new": "New supplier",
  "/reports": "Reports",
  "/users": "Users",
  "/settings": "Settings",
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) {
    return pageTitles[pathname]
  }

  if (/^\/products\/[^/]+\/edit$/.test(pathname)) {
    return "Edit product"
  }

  if (/^\/products\/[^/]+$/.test(pathname)) {
    return "Product detail"
  }

  if (/^\/inventory\/warehouses\/[^/]+\/edit$/.test(pathname)) {
    return "Edit warehouse"
  }

  if (/^\/inventory\/adjustments\/[^/]+$/.test(pathname)) {
    return "Adjustment detail"
  }

  if (/^\/suppliers\/[^/]+\/edit$/.test(pathname)) {
    return "Edit supplier"
  }

  if (/^\/suppliers\/[^/]+$/.test(pathname)) {
    return "Supplier detail"
  }

  if (/^\/purchases\/[^/]+\/receive$/.test(pathname)) {
    return "Receive purchase"
  }

  if (/^\/purchases\/[^/]+$/.test(pathname)) {
    return "Purchase detail"
  }

  if (/^\/customers\/[^/]+\/edit$/.test(pathname)) {
    return "Edit customer"
  }

  if (/^\/customers\/[^/]+$/.test(pathname)) {
    return "Customer detail"
  }

  if (/^\/customers\/new$/.test(pathname)) {
    return "New customer"
  }

  if (/^\/sales\/[^/]+\/return$/.test(pathname)) {
    return "Process return"
  }

  if (/^\/sales\/[^/]+$/.test(pathname)) {
    return "Sale detail"
  }

  if (/^\/returns\/[^/]+$/.test(pathname)) {
    return "Return detail"
  }

  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(`${path}/`)
  )

  return match?.[1] ?? "Inventario Pro"
}

type AppLayoutClientProps = {
  user: AuthenticatedUser
  children: React.ReactNode
}

export function AppLayoutClient({ user, children }: AppLayoutClientProps) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <AppShell title={title} user={user}>
      {children}
    </AppShell>
  )
}
