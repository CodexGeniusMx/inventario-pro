"use client"

import Link from "next/link"
import {
  Menu,
  Plus,
  Search,
  ShoppingCart,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type HeaderProps = {
  title: string
  onMenuClick?: () => void
  className?: string
}

function UserAvatarMenu() {
  return (
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full bg-muted font-medium"
        aria-label="User menu"
      >
        AM
      </Button>
      <DropdownMenu placement="bottom end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Ana Martínez</span>
            <span className="text-xs font-normal text-muted-foreground">
              ana@elpunto.com · Admin
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem id="profile">Profile</DropdownMenuItem>
        <DropdownMenuItem id="settings">Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem id="logout">Log out</DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

export function Header({ title, onMenuClick, className }: HeaderProps) {
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
        aria-label="Open navigation menu"
      >
        <Menu className="size-4" />
      </Button>

      <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            readOnly
            placeholder="Search… ⌘K"
            className="h-8 w-52 cursor-pointer pl-8 lg:w-64"
            aria-label="Global search"
          />
        </div>

        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Search">
          <Search className="size-4" />
        </Button>

        <Link
          href="/sales/new"
          className={buttonVariants({ size: "sm" })}
        >
          <ShoppingCart data-icon="inline-start" />
          New sale
        </Link>

        <DropdownMenuTrigger>
          <Button variant="outline" size="icon-sm" aria-label="More actions">
            <Plus className="size-4" />
          </Button>
          <DropdownMenu placement="bottom end" className="w-48">
            <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem id="new-product">New product</DropdownMenuItem>
            <DropdownMenuItem id="new-po">New purchase order</DropdownMenuItem>
            <DropdownMenuItem id="adjust-stock">Adjust stock</DropdownMenuItem>
            <DropdownMenuItem id="record-damage">Record damage/loss</DropdownMenuItem>
          </DropdownMenu>
        </DropdownMenuTrigger>

        <UserAvatarMenu />
      </div>
    </header>
  )
}
