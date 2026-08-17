"use client"

import { usePathname } from "next/navigation"

import { AppShell } from "@/components/layout/app-shell"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/inventory": "Inventory",
  "/purchases": "Purchases",
  "/sales": "Sales",
  "/sales/new": "New sale",
  "/customers": "Customers",
  "/suppliers": "Suppliers",
  "/reports": "Reports",
  "/users": "Users",
  "/settings": "Settings",
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) {
    return pageTitles[pathname]
  }

  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(`${path}/`)
  )

  return match?.[1] ?? "Inventario Pro"
}

type AppLayoutClientProps = {
  children: React.ReactNode
}

export function AppLayoutClient({ children }: AppLayoutClientProps) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return <AppShell title={title}>{children}</AppShell>
}
