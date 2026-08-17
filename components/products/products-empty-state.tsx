import { PackageOpen } from "lucide-react"

import { LinkButton } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ProductsEmptyStateProps = {
  canWrite: boolean
  hasFilters: boolean
}

export function ProductsEmptyState({
  canWrite,
  hasFilters,
}: ProductsEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-muted">
          <PackageOpen className="size-6 text-muted-foreground" />
        </div>
        <CardTitle>
          {hasFilters ? "No products match your filters" : "No products yet"}
        </CardTitle>
        <CardDescription>
          {hasFilters
            ? "Try adjusting your search or filters to find what you need."
            : "Create your first product to start building your catalog."}
        </CardDescription>
        {canWrite && !hasFilters && (
          <LinkButton href="/products/new" className="mt-4">
            Create product
          </LinkButton>
        )}
      </CardHeader>
    </Card>
  )
}
