"use client"

import { Package2, PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { NavLink } from "@/components/layout/nav-link"
import type { AuthenticatedUser } from "@/lib/auth/types"
import { isAdmin } from "@/lib/auth/permissions"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { mainNavItems } from "@/lib/navigation"
import { cn } from "@/lib/utils"

type SidebarProps = {
  user: AuthenticatedUser
  collapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
  className?: string
}

export function Sidebar({
  user,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  className,
}: SidebarProps) {
  const navItems = mainNavItems.filter(
    (item) => !item.adminOnly || isAdmin(user)
  )

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-sidebar-border px-4",
          collapsed && "justify-center px-2"
        )}
      >
        <Package2 className="size-5 shrink-0 text-sidebar-primary" />
        {!collapsed && (
          <div className="ml-3 min-w-0">
            <p className="truncate text-sm font-semibold">Inventario Pro</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.organizationName}
            </p>
          </div>
        )}
      </div>

      <nav
        className="flex-1 space-y-0.5 overflow-y-auto p-2"
        aria-label="Main navigation"
      >
        {navItems.map((item) => (
          <div key={item.href} className="relative">
            <NavLink
              href={item.href}
              title={item.title}
              icon={item.icon}
              badge={item.badge}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </div>
        ))}
      </nav>

      {onToggleCollapse && (
        <>
          <Separator />
          <div className="hidden p-2 lg:block">
            <Button
              variant="ghost"
              size={collapsed ? "icon-sm" : "sm"}
              className={cn(
                "w-full text-muted-foreground",
                collapsed && "size-8"
              )}
              onPress={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <>
                  <PanelLeftClose className="size-4" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </aside>
  )
}
