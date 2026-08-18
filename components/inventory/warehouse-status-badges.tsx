import { Badge } from "@/components/ui/badge"
import type { WarehouseRow } from "@/types/inventory"

type WarehouseStatusBadgesProps = {
  warehouse: Pick<WarehouseRow, "isDefault" | "isActive">
}

export function WarehouseStatusBadges({ warehouse }: WarehouseStatusBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {warehouse.isDefault && <Badge variant="secondary">Predeterminado</Badge>}
      <Badge variant={warehouse.isActive ? "secondary" : "outline"}>
        {warehouse.isActive ? "Activo" : "Inactivo"}
      </Badge>
    </div>
  )
}
