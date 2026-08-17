"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

type CustomersFiltersProps = {
  initialQuery?: string
  initialStatus?: "all" | "active" | "inactive"
}

export function CustomersFilters({
  initialQuery = "",
  initialStatus = "all",
}: CustomersFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateFilters(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    router.push(`/customers?${params.toString()}`)
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="customer-search" className="mb-1 block text-sm font-medium">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="customer-search"
            defaultValue={initialQuery}
            placeholder="Search by name, email, phone, or tax ID"
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
        <label htmlFor="customer-status" className="mb-1 block text-sm font-medium">
          Status
        </label>
        <select
          id="customer-status"
          defaultValue={initialStatus}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          onChange={(event) => updateFilters("status", event.target.value)}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>
  )
}
