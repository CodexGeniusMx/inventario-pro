"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const accountSections = [
  { href: "/account/profile", label: "Mi perfil" },
  { href: "/account/appearance", label: "Apariencia" },
  { href: "/account/accessibility", label: "Accesibilidad" },
  { href: "/account/notifications", label: "Notificaciones" },
  { href: "/account/security", label: "Seguridad" },
]

type AccountNavClientProps = {
  className?: string
}

export function AccountNavClient({ className }: AccountNavClientProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-wrap gap-2 lg:flex-col lg:gap-1", className)}>
      {accountSections.map((section) => {
        const isActive =
          pathname === section.href ||
          (section.href === "/account/profile" && pathname === "/account")

        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-xl px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {section.label}
          </Link>
        )
      })}
    </nav>
  )
}
