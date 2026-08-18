"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

type SuppliersFiltersProps = {
  initialQuery?: string
  initialStatus?: "all" | "active" | "inactive"
}

export function SuppliersFilters({
  initialQuery = "",
  initialStatus = "all",
}: SuppliersFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateFilters(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    router.push(`/suppliers?${params.toString()}`)
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="supplier-search" className="mb-1 block text-sm font-medium">
          Buscar
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="supplier-search"
            defaultValue={initialQuery}
            placeholder="Buscar por nombre, contacto, correo, teléfono o RFC"
            className="pl-9"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                updateFilters("q", event.currentTarget.value)
              }
            }}
            onBlur={(event) => {
              if (event.target.value !== initialQuery) {
                updateFilters("q", event.target.value)
              }
            }}
          />
        </div>
      </div>

      <div className="sm:w-48">
        <label htmlFor="supplier-status" className="mb-1 block text-sm font-medium">
          Estado
        </label>
        <select
          id="supplier-status"
          defaultValue={initialStatus}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          onChange={(event) => updateFilters("status", event.target.value)}
        >
          <option value="all">Todos</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>
    </div>
  )
}
