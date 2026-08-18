"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const sections = [
  { id: "empresa", label: "Empresa", href: "/settings#empresa" },
  { id: "monedas", label: "Monedas", href: "/settings#monedas" },
  { id: "inventario", label: "Inventario", href: "/settings#inventario" },
  { id: "documentos", label: "Documentos", href: "/settings#documentos" },
  { id: "usuarios", label: "Usuarios y permisos", href: "/users" },
  { id: "keep-ai", label: "Asistente IA", href: "/settings#keep-ai" },
  { id: "whatsapp", label: "WhatsApp", href: "/settings#whatsapp" },
  { id: "automatizaciones", label: "Soporte / Automatizaciones", href: "/settings#automatizaciones" },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
      {sections.map((section) => (
        <Link
          key={section.id}
          href={section.href}
          className={cn(
            "rounded-xl px-3 py-2 text-sm transition-colors",
            pathname === section.href || pathname.startsWith(section.href.replace("#", ""))
              ? "bg-muted font-medium"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  )
}
