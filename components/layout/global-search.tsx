"use client"

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  globalSearchTypeLabel,
  type GlobalSearchResult,
} from "@/lib/search/types"
import { cn } from "@/lib/utils"

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform)
}

type GlobalSearchProps = {
  className?: string
  compact?: boolean
}

export function GlobalSearch({ className, compact = false }: GlobalSearchProps) {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const shortcutLabel = isMacPlatform() ? "⌘K" : "Ctrl+K"

  const close = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
  }, [])

  const openSearch = useCallback(() => {
    setOpen(true)
    setError(null)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"

      if (isShortcut) {
        event.preventDefault()
        openSearch()
        return
      }

      if (event.key === "Escape" && open) {
        event.preventDefault()
        close()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, close, openSearch])

  useEffect(() => {
    if (!open) return

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setActiveIndex(-1)
      return
    }

    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
          if (!response.ok) {
            setError("No se pudo buscar.")
            setResults([])
            return
          }

          const payload = (await response.json()) as { results: GlobalSearchResult[] }
          setResults(payload.results)
          setActiveIndex(payload.results.length > 0 ? 0 : -1)
          setError(null)
        } catch {
          setError("No se pudo buscar.")
          setResults([])
        }
      })
    }, 200)

    return () => window.clearTimeout(timeout)
  }, [open, query])

  return (
    <>
      {compact ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Buscar"
          onPress={openSearch}
        >
          <Search className="size-4" />
        </Button>
      ) : (
        <button
          type="button"
          onClick={openSearch}
          className={cn("relative hidden md:block", className)}
          aria-label="Abrir búsqueda global"
        >
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            readOnly
            value=""
            placeholder={`Buscar… ${shortcutLabel}`}
            className="h-8 w-52 cursor-pointer pl-8 lg:w-64"
            aria-hidden
            tabIndex={-1}
          />
        </button>
      )}

      <Dialog
        isOpen={open}
        onOpenChange={(nextOpen) => (nextOpen ? openSearch() : close())}
        className="top-[20%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="sr-only">Búsqueda global</DialogTitle>
          <DialogDescription className="sr-only">
            Busca productos, clientes, proveedores, compras y ventas.
          </DialogDescription>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar productos, SKU, clientes, compras, ventas…"
              aria-label="Buscar en la aplicación"
              aria-controls={listboxId}
              aria-activedescendant={
                activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
              }
              role="combobox"
              aria-expanded={results.length > 0}
              aria-autocomplete="list"
              className="h-10 pl-9"
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  setActiveIndex((current) =>
                    results.length === 0 ? -1 : Math.min(current + 1, results.length - 1)
                  )
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault()
                  setActiveIndex((current) => Math.max(current - 1, 0))
                }

                if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
                  event.preventDefault()
                  window.location.href = results[activeIndex].href
                  close()
                }
              }}
            />
          </div>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim().length < 2 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Escribe al menos 2 caracteres para buscar.
            </p>
          )}

          {query.trim().length >= 2 && isPending && (
            <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Buscando…
            </div>
          )}

          {error && (
            <p className="px-3 py-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {!isPending && query.trim().length >= 2 && results.length === 0 && !error && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No se encontraron resultados.
            </p>
          )}

          <ul id={listboxId} role="listbox" className="space-y-1">
            {results.map((result, index) => (
              <li key={`${result.type}-${result.id}`} role="option" aria-selected={index === activeIndex}>
                <Link
                  id={`${listboxId}-option-${index}`}
                  href={result.href}
                  onClick={close}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted",
                    index === activeIndex && "bg-muted"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{result.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {globalSearchTypeLabel(result.type)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </>
  )
}
