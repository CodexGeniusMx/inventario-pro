"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { isNavItemActive } from "@/lib/navigation"

type NavLinkProps = {
  href: string
  title: string
  icon: LucideIcon
  badge?: number
  collapsed?: boolean
  onNavigate?: () => void
}

export function NavLink({
  href,
  title,
  icon: Icon,
  badge,
  collapsed = false,
  onNavigate,
}: NavLinkProps) {
  const pathname = usePathname()
  const isActive = isNavItemActive(pathname, href)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? title : undefined}
      className={cn(
        "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{title}</span>
          {badge !== undefined && badge > 0 && (
            <Badge
              variant={href === "/inventory" ? "destructive" : "secondary"}
              className="h-5 min-w-5 px-1.5"
            >
              {badge}
            </Badge>
          )}
        </>
      )}
      {collapsed && badge !== undefined && badge > 0 && (
        <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive" />
      )}
    </Link>
  )
}
