"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import {
  createWarehouseAction,
  updateWarehouseAction,
} from "@/app/actions/inventory"
import { Button, LinkButton } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  createWarehouseSchema,
  updateWarehouseSchema,
} from "@/lib/validations/inventory.schema"
import type { WarehouseRow } from "@/types/inventory"

type WarehouseFormProps = {
  mode: "create" | "edit"
  warehouse?: WarehouseRow
}

type FormState = {
  name: string
  code: string
  address: string
  isDefault: boolean
  isActive: boolean
}

function getInitialState(warehouse?: WarehouseRow): FormState {
  return {
    name: warehouse?.name ?? "",
    code: warehouse?.code ?? "",
    address: warehouse?.address ?? "",
    isDefault: warehouse?.isDefault ?? false,
    isActive: warehouse?.isActive ?? true,
  }
}

function mapFieldErrors(
  fieldErrors: Record<string, string[]>
): Record<string, string> {
  const mapped: Record<string, string> = {}

  for (const [key, messages] of Object.entries(fieldErrors)) {
    mapped[key] = messages[0] ?? "Valor no válido."
  }

  return mapped
}

export function WarehouseForm({ mode, warehouse }: WarehouseFormProps) {
  const router = useRouter()
  const [formState, setFormState] = useState<FormState>(() =>
    getInitialState(warehouse)
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    const payload = {
      name: formState.name,
      code: formState.code,
      address: formState.address,
      isDefault: formState.isDefault,
      isActive: formState.isActive,
    }

    const parsed =
      mode === "create"
        ? createWarehouseSchema.safeParse(payload)
        : updateWarehouseSchema.safeParse(payload)

    if (!parsed.success) {
      const nextFieldErrors: Record<string, string[]> = {}

      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "form"
        nextFieldErrors[key] = [...(nextFieldErrors[key] ?? []), issue.message]
      }

      setFieldErrors(mapFieldErrors(nextFieldErrors))
      setIsSubmitting(false)
      return
    }

    const result =
      mode === "create"
        ? await createWarehouseAction(parsed.data)
        : await updateWarehouseAction(warehouse!.id, parsed.data)

    if (!result.success) {
      if (result.error.fieldErrors) {
        setFieldErrors(mapFieldErrors(result.error.fieldErrors))
      }

      setFormError(result.error.message)
      setIsSubmitting(false)
      return
    }

    router.push("/inventory/warehouses")
    router.refresh()
  }

  function fieldError(path: string): string | undefined {
    return fieldErrors[path]
  }

  return (
    <form className="max-w-2xl space-y-6" onSubmit={handleSubmit} noValidate>
      {formError && (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {formError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalles del almacén</CardTitle>
          <CardDescription>
            Los almacenes delimitan todos los saldos y movimientos de inventario.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Nombre
            </label>
            <Input
              id="name"
              value={formState.name}
              onChange={(event) => updateField("name", event.target.value)}
              aria-invalid={Boolean(fieldError("name"))}
              disabled={isSubmitting}
            />
            {fieldError("name") && (
              <p className="text-sm text-destructive">{fieldError("name")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Código
            </label>
            <Input
              id="code"
              value={formState.code}
              onChange={(event) => updateField("code", event.target.value)}
              aria-invalid={Boolean(fieldError("code"))}
              disabled={isSubmitting}
            />
            {fieldError("code") && (
              <p className="text-sm text-destructive">{fieldError("code")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium">
              Dirección
            </label>
            <Textarea
              id="address"
              rows={3}
              value={formState.address}
              onChange={(event) => updateField("address", event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formState.isDefault}
              onChange={(event) => updateField("isDefault", event.target.checked)}
              disabled={isSubmitting}
            />
            Establecer como almacén predeterminado
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(event) => updateField("isActive", event.target.checked)}
              disabled={isSubmitting || (warehouse?.isDefault ?? false)}
            />
            Activo
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" isDisabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              Guardando…
            </>
          ) : mode === "create" ? (
            "Crear almacén"
          ) : (
            "Guardar cambios"
          )}
        </Button>
        <LinkButton href="/inventory/warehouses" variant="outline">
          Cancelar
        </LinkButton>
      </div>
    </form>
  )
}
