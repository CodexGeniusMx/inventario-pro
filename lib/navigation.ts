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

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  badge?: number
  adminOnly?: boolean
}

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Products", href: "/products", icon: Tag },
  { title: "Inventory", href: "/inventory", icon: Package },
  { title: "Purchases", href: "/purchases", icon: ClipboardList },
  { title: "Sales", href: "/sales", icon: ShoppingCart },
  { title: "Returns", href: "/returns", icon: RotateCcw },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Suppliers", href: "/suppliers", icon: Building2 },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Users", href: "/users", icon: UserCog, adminOnly: true },
  { title: "Settings", href: "/settings", icon: Settings, adminOnly: true },
]

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}
