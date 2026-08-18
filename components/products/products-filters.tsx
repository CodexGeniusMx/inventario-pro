"use client"

import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CategoryOption } from "@/types/catalog"

type ProductsFiltersProps = {
  categories: CategoryOption[]
  initialQuery?: string
  initialCategoryId?: string
  initialStatus?: string
}

export function ProductsFilters({
  categories,
  initialQuery = "",
  initialCategoryId = "",
  initialStatus = "active",
}: ProductsFiltersProps) {
  const router = useRouter()
  const hasActiveFilters =
    Boolean(initialQuery) ||
    Boolean(initialCategoryId) ||
    initialStatus !== "active"

  function handleReset() {
    router.push("/products")
  }

  return (
    <form
      className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-4 lg:flex-row lg:items-end"
      method="get"
      action="/products"
    >
      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="q" className="text-sm font-medium">
            Buscar
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="q"
              name="q"
              defaultValue={initialQuery}
              placeholder="Nombre, SKU o código de barras"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="categoryId" className="text-sm font-medium">
            Categoría
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={initialCategoryId}
            className="flex h-8 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Estado
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initialStatus}
            className="flex h-8 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <option value="active">Activo</option>
            <option value="archived">Archivado</option>
            <option value="all">Todos</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit">Aplicar</Button>
        {hasActiveFilters && (
          <Button type="button" variant="outline" onPress={handleReset}>
            <X data-icon="inline-start" />
            Restablecer
          </Button>
        )}
      </div>
    </form>
  )
}
