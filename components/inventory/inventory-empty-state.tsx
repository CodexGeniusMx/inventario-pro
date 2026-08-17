import { PackageOpen } from "lucide-react"

import { LinkButton } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type InventoryEmptyStateProps = {
  hasFilters: boolean
  canAdjust: boolean
  hasWarehouse: boolean
}

export function InventoryEmptyState({
  hasFilters,
  canAdjust,
  hasWarehouse,
}: InventoryEmptyStateProps) {
  if (!hasWarehouse) {
    return (
      <Card className="border-dashed">
        <CardHeader className="items-center text-center">
          <CardTitle>No warehouse configured</CardTitle>
          <CardDescription>
            Create a warehouse before recording inventory or stock movements.
          </CardDescription>
          <LinkButton href="/inventory/warehouses/new" className="mt-4">
            Create warehouse
          </LinkButton>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-muted">
          <PackageOpen className="size-6 text-muted-foreground" />
        </div>
        <CardTitle>
          {hasFilters ? "No inventory matches your filters" : "No inventory recorded"}
        </CardTitle>
        <CardDescription>
          {hasFilters
            ? "Try adjusting your search or filters."
            : "Record initial stock to start tracking quantities."}
        </CardDescription>
        {canAdjust && !hasFilters && (
          <LinkButton href="/inventory/adjustments/new" className="mt-4">
            Record initial stock
          </LinkButton>
        )}
      </CardHeader>
    </Card>
  )
}
