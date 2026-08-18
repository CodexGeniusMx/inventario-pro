"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { updateInventorySettingsAction } from "@/app/actions/settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { WarehouseRow } from "@/types/inventory"

type InventorySettingsFormProps = {
  defaultWarehouseId: string | null
  warehouses: WarehouseRow[]
}

export function InventorySettingsForm({
  defaultWarehouseId,
  warehouses,
}: InventorySettingsFormProps) {
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId ?? "")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <Card id="inventario">
      <CardHeader>
        <CardTitle>Inventario</CardTitle>
        <CardDescription>
          Preferencias operativas. El inventario negativo sigue prohibido y los movimientos permanecen inmutables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="default-warehouse">
            Almacén predeterminado
          </label>
          <select
            id="default-warehouse"
            className="flex h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
            value={warehouseId}
            onChange={(event) => setWarehouseId(event.target.value)}
          >
            <option value="">Sin predeterminado</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Button
          isDisabled={isPending}
          onPress={() => {
            setError(null)
            setMessage(null)
            startTransition(async () => {
              const result = await updateInventorySettingsAction({
                defaultWarehouseId: warehouseId || null,
              })
              if (!result.success) {
                setError(result.error.message)
                return
              }
              setMessage(result.data.message)
            })
          }}
        >
          {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar inventario
        </Button>
      </CardContent>
    </Card>
  )
}
