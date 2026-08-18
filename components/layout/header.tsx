"use client"

import Link from "next/link"
import {
  Menu,
  Plus,
  ShoppingCart,
} from "lucide-react"

import { GlobalSearch } from "@/components/layout/global-search"
import type { AuthenticatedUser } from "@/lib/auth/types"
import { hasPermission, isAdmin } from "@/lib/auth/permissions"
import { UserMenu } from "@/components/layout/user-menu"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type HeaderProps = {
  title: string
  user: AuthenticatedUser
  onMenuClick?: () => void
  className?: string
}

export function Header({ title, user, onMenuClick, className }: HeaderProps) {
  const canCreateSale =
    hasPermission(user, "sales", "complete") ||
    hasPermission(user, "sales", "create") ||
    hasPermission(user, "sales", "write")

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 lg:px-6",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onPress={onMenuClick}
        aria-label="Abrir menú de navegación"
      >
        <Menu className="size-4" />
      </Button>

      <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />
        <GlobalSearch compact />

        {canCreateSale && (
          <Link
            href="/sales/new"
            className={buttonVariants({ size: "sm" })}
          >
            <ShoppingCart data-icon="inline-start" />
            Nueva venta
          </Link>
        )}

        {isAdmin(user) && (
          <DropdownMenuTrigger>
            <Button variant="outline" size="icon-sm" aria-label="Más acciones">
              <Plus className="size-4" />
            </Button>
            <DropdownMenu placement="bottom end" className="w-48">
              <DropdownMenuLabel>Acciones rápidas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem href="/products/new">Nuevo producto</DropdownMenuItem>
              <DropdownMenuItem href="/purchases/new">Nueva orden de compra</DropdownMenuItem>
              <DropdownMenuItem href="/inventory/adjustments/new">Ajustar stock</DropdownMenuItem>
              <DropdownMenuItem href="/inventory/adjustments/new">Registrar daño/pérdida</DropdownMenuItem>
            </DropdownMenu>
          </DropdownMenuTrigger>
        )}

        <UserMenu user={user} />
      </div>
    </header>
  )
}
