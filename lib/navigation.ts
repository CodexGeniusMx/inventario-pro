import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
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
}

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Products", href: "/products", icon: Tag },
  { title: "Inventory", href: "/inventory", icon: Package, badge: 8 },
  { title: "Purchases", href: "/purchases", icon: ClipboardList },
  { title: "Sales", href: "/sales", icon: ShoppingCart },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Suppliers", href: "/suppliers", icon: Building2 },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Users", href: "/users", icon: UserCog },
  { title: "Settings", href: "/settings", icon: Settings },
]

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}
