import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  RotateCcw,
  ShoppingCart,
  Tag,
  UserCog,
  Users,
} from "lucide-react"

import type { AuthenticatedUser } from "@/lib/auth/types"
import { hasPermission, canManageSettings, canManageUsers } from "@/lib/auth/permissions"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  badge?: number
  adminOnly?: boolean
  visible?: (user: AuthenticatedUser) => boolean
}

export const mainNavItems: NavItem[] = [
  {
    title: "Panel",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Productos",
    href: "/products",
    icon: Tag,
    visible: (user) =>
      hasPermission(user, "products", "read") ||
      hasPermission(user, "products", "view"),
  },
  {
    title: "Inventario",
    href: "/inventory",
    icon: Package,
    visible: (user) =>
      hasPermission(user, "inventory", "read") ||
      hasPermission(user, "inventory", "view"),
  },
  {
    title: "Compras",
    href: "/purchases",
    icon: ClipboardList,
    visible: (user) =>
      hasPermission(user, "purchases", "read") ||
      hasPermission(user, "purchases", "view"),
  },
  {
    title: "Ventas",
    href: "/sales",
    icon: ShoppingCart,
    visible: (user) =>
      hasPermission(user, "sales", "read") ||
      hasPermission(user, "sales", "view"),
  },
  {
    title: "Devoluciones",
    href: "/returns",
    icon: RotateCcw,
    visible: (user) =>
      hasPermission(user, "returns", "read") ||
      hasPermission(user, "returns", "write"),
  },
  {
    title: "Clientes",
    href: "/customers",
    icon: Users,
    visible: (user) =>
      hasPermission(user, "customers", "read") ||
      hasPermission(user, "customers", "view"),
  },
  {
    title: "Proveedores",
    href: "/suppliers",
    icon: Building2,
    visible: (user) =>
      hasPermission(user, "suppliers", "read") ||
      hasPermission(user, "suppliers", "view"),
  },
  {
    title: "Reportes",
    href: "/reports",
    icon: BarChart3,
    visible: (user) => hasPermission(user, "reports", "read"),
  },
  {
    title: "Usuarios",
    href: "/users",
    icon: UserCog,
    visible: (user) => canManageUsers(user),
  },
  {
    title: "Configuración",
    href: "/settings",
    icon: Settings,
    visible: (user) => canManageSettings(user),
  },
]

export function isNavItemVisible(user: AuthenticatedUser, item: NavItem): boolean {
  if (item.visible) {
    return item.visible(user)
  }

  if (item.adminOnly) {
    return user.role === "admin" || user.role === "owner"
  }

  return true
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}
