"use client"

import Link from "next/link"
import { Package2, PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { NavLink } from "@/components/layout/nav-link"
import type { AuthenticatedUser } from "@/lib/auth/types"
import { isNavItemVisible } from "@/lib/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { mainNavItems } from "@/lib/navigation"
import { APP_NAME, APP_COMPANY } from "@/lib/i18n/branding"
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
  const navItems = mainNavItems.filter((item) => isNavItemVisible(user, item))

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
            <p className="truncate text-sm font-semibold">{APP_NAME}</p>
            <p className="truncate text-xs text-muted-foreground">
              {APP_COMPANY}
            </p>
          </div>
        )}
      </div>

      <nav
        className="flex-1 space-y-0.5 overflow-y-auto p-2"
        aria-label="Navegación principal"
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

      {process.env.NODE_ENV === "development" && (
        <>
          <Separator />
          <div className={cn("px-2 pb-2", collapsed && "flex justify-center")}>
            <Link
              href="/dev/testing"
              className={cn(
                "block rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "px-0 text-center"
              )}
              title="Dev/QA — Keep AI evaluación"
              onClick={onNavigate}
            >
              {collapsed ? "QA" : "Dev/QA"}
            </Link>
          </div>
        </>
      )}

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
              aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <>
                  <PanelLeftClose className="size-4" />
                  <span>Contraer</span>
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </aside>
  )
}
