"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const inventoryLinks = [
  { href: "/inventory", label: "Overview", exact: true },
  { href: "/inventory/movements", label: "Movements" },
  { href: "/inventory/adjustments", label: "Adjustments" },
  { href: "/inventory/warehouses", label: "Warehouses" },
]

export function InventorySubNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Inventory sections"
      className="mb-6 flex flex-wrap gap-2 border-b pb-4"
    >
      {inventoryLinks.map((link) => {
        const isActive = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`)

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-2xl px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
