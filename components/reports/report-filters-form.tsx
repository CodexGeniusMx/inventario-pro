"use client"

import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import type { ReportDatePreset } from "@/types/reports"

type ReportFilterValues = {
  preset: ReportDatePreset
  from?: string
  to?: string
  warehouseId?: string
  supplierId?: string
  customerId?: string
  movementType?: string
}

type ReportFiltersFormProps = {
  actionPath: string
  values: ReportFilterValues
  warehouses: Array<{ id: string; name: string }>
  suppliers?: Array<{ id: string; name: string }>
  customers?: Array<{ id: string; name: string }>
  movementTypes?: string[]
  showWarehouse?: boolean
  showSupplier?: boolean
  showCustomer?: boolean
  showMovementType?: boolean
}

export function ReportFiltersForm({
  actionPath,
  values,
  warehouses,
  suppliers = [],
  customers = [],
  movementTypes = [],
  showWarehouse = false,
  showSupplier = false,
  showCustomer = false,
  showMovementType = false,
}: ReportFiltersFormProps) {
  const router = useRouter()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const params = new URLSearchParams()

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim() !== "") {
        params.set(key, value)
      }
    }

    router.push(`${actionPath}?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <div>
        <label htmlFor="preset" className="mb-1 block text-sm font-medium">
          Rango de fechas
        </label>
        <select
          id="preset"
          name="preset"
          defaultValue={values.preset}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="today">Hoy</option>
          <option value="last_7_days">Últimos 7 días</option>
          <option value="last_30_days">Últimos 30 días</option>
          <option value="this_month">Este mes</option>
          <option value="custom">Rango personalizado</option>
        </select>
      </div>

      <div>
        <label htmlFor="from" className="mb-1 block text-sm font-medium">
          Desde
        </label>
        <input
          id="from"
          name="from"
          type="date"
          defaultValue={values.from}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="to" className="mb-1 block text-sm font-medium">
          Hasta
        </label>
        <input
          id="to"
          name="to"
          type="date"
          defaultValue={values.to}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {showWarehouse ? (
        <div>
          <label htmlFor="warehouseId" className="mb-1 block text-sm font-medium">
            Almacén
          </label>
          <select
            id="warehouseId"
            name="warehouseId"
            defaultValue={values.warehouseId ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos los almacenes</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showSupplier ? (
        <div>
          <label htmlFor="supplierId" className="mb-1 block text-sm font-medium">
            Proveedor
          </label>
          <select
            id="supplierId"
            name="supplierId"
            defaultValue={values.supplierId ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos los proveedores</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showCustomer ? (
        <div>
          <label htmlFor="customerId" className="mb-1 block text-sm font-medium">
            Cliente
          </label>
          <select
            id="customerId"
            name="customerId"
           defaultValue={values.customerId ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos los clientes</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showMovementType ? (
        <div>
          <label htmlFor="movementType" className="mb-1 block text-sm font-medium">
            Tipo de movimiento
          </label>
          <select
            id="movementType"
            name="movementType"
            defaultValue={values.movementType ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos los tipos</option>
            {movementTypes.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex items-end">
        <Button type="submit" className="w-full">
          Aplicar filtros
        </Button>
      </div>
    </form>
  )
}
