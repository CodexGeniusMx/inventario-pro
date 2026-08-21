"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const sections = [
  { id: "empresa", label: "Empresa", href: "/settings#empresa" },
  { id: "monedas", label: "Monedas", href: "/settings#monedas" },
  { id: "inventario", label: "Inventario", href: "/settings#inventario" },
  { id: "documentos", label: "Documentos", href: "/settings#documentos" },
  { id: "usuarios", label: "Usuarios", href: "/users" },
  { id: "permisos", label: "Roles y permisos", href: "/settings/permissions" },
  { id: "keep-ai", label: "Asistente IA", href: "/settings#keep-ai" },
  { id: "whatsapp", label: "WhatsApp", href: "/settings#whatsapp" },
  {
    id: "automatizaciones",
    label: "Soporte / Automatizaciones",
    href: "/settings#automatizaciones",
  },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
      <p className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:block">
        Administrar empresa
      </p>
      {sections.map((section) => {
        const isActive =
          pathname === section.href ||
          pathname.startsWith(`${section.href}/`) ||
          (section.href === "/settings/permissions" &&
            pathname.startsWith("/settings/permissions"))

        return (
          <Link
            key={section.id}
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
