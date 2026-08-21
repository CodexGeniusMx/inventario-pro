"use client"

import { usePathname } from "next/navigation"

import { AppShell } from "@/components/layout/app-shell"
import type { AuthenticatedUser } from "@/lib/auth/types"
import { APP_NAME } from "@/lib/i18n/branding"

const pageTitles: Record<string, string> = {
  "/dashboard": "Panel",
  "/products": "Productos",
  "/products/new": "Nuevo producto",
  "/inventory": "Inventario",
  "/inventory/movements": "Movimientos",
  "/inventory/adjustments": "Ajustes",
  "/inventory/adjustments/new": "Nuevo ajuste",
  "/inventory/warehouses": "Almacenes",
  "/inventory/warehouses/new": "Nuevo almacén",
  "/purchases": "Compras",
  "/purchases/new": "Nueva compra",
  "/sales": "Ventas",
  "/sales/new": "Nueva venta",
  "/returns": "Devoluciones",
  "/customers": "Clientes",
  "/customers/new": "Nuevo cliente",
  "/suppliers": "Proveedores",
  "/suppliers/new": "Nuevo proveedor",
  "/reports": "Reportes",
  "/users": "Usuarios",
  "/settings": "Administrar empresa",
  "/settings/permissions": "Roles y permisos",
  "/account": "Mi cuenta",
  "/account/profile": "Mi perfil",
  "/account/appearance": "Apariencia",
  "/account/accessibility": "Accesibilidad",
  "/account/notifications": "Notificaciones",
  "/account/security": "Seguridad",
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) {
    return pageTitles[pathname]
  }

  if (/^\/products\/[^/]+\/edit$/.test(pathname)) {
    return "Editar producto"
  }

  if (/^\/products\/[^/]+$/.test(pathname)) {
    return "Detalle de producto"
  }

  if (/^\/inventory\/warehouses\/[^/]+\/edit$/.test(pathname)) {
    return "Editar almacén"
  }

  if (/^\/inventory\/adjustments\/[^/]+$/.test(pathname)) {
    return "Detalle de ajuste"
  }

  if (/^\/suppliers\/[^/]+\/edit$/.test(pathname)) {
    return "Editar proveedor"
  }

  if (/^\/suppliers\/[^/]+$/.test(pathname)) {
    return "Detalle de proveedor"
  }

  if (/^\/purchases\/[^/]+\/receive$/.test(pathname)) {
    return "Recibir compra"
  }

  if (/^\/purchases\/[^/]+$/.test(pathname)) {
    return "Detalle de compra"
  }

  if (/^\/customers\/[^/]+\/edit$/.test(pathname)) {
    return "Editar cliente"
  }

  if (/^\/customers\/[^/]+$/.test(pathname)) {
    return "Detalle de cliente"
  }

  if (/^\/customers\/new$/.test(pathname)) {
    return "Nuevo cliente"
  }

  if (/^\/sales\/[^/]+\/return$/.test(pathname)) {
    return "Procesar devolución"
  }

  if (/^\/sales\/[^/]+$/.test(pathname)) {
    return "Detalle de venta"
  }

  if (/^\/returns\/[^/]+$/.test(pathname)) {
    return "Detalle de devolución"
  }

  if (/^\/reports\/[^/]+$/.test(pathname)) {
    return "Detalle de reporte"
  }

  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(`${path}/`)
  )

  return match?.[1] ?? APP_NAME
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
