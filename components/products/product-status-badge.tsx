import { Badge } from "@/components/ui/badge"
import type { ProductStatus } from "@/types/catalog"
import { cn } from "@/lib/utils"

type ProductStatusBadgeProps = {
  status: ProductStatus
  className?: string
}

export function ProductStatusBadge({ status, className }: ProductStatusBadgeProps) {
  return (
    <Badge
      variant={status === "active" ? "secondary" : "outline"}
      className={cn(
        status === "archived" && "text-muted-foreground",
        className
      )}
    >
      {status === "active" ? "Active" : "Archived"}
    </Badge>
  )
}
