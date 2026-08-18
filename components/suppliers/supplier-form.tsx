"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import {
  createSupplierAction,
  updateSupplierAction,
} from "@/app/actions/suppliers"
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
  createSupplierSchema,
  updateSupplierSchema,
} from "@/lib/validations/supplier.schema"
import type { SupplierDetail } from "@/types/suppliers"

type SupplierFormProps = {
  mode: "create" | "edit"
  supplier?: SupplierDetail
}

type FormState = {
  name: string
  contactName: string
  email: string
  phone: string
  taxId: string
  paymentTerms: string
  notes: string
  isActive: boolean
}

function getInitialState(supplier?: SupplierDetail): FormState {
  return {
    name: supplier?.name ?? "",
    contactName: supplier?.contactName ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    taxId: supplier?.taxId ?? "",
    paymentTerms: supplier?.paymentTerms ?? "",
    notes: supplier?.notes ?? "",
    isActive: supplier?.isActive ?? true,
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

export function SupplierForm({ mode, supplier }: SupplierFormProps) {
  const router = useRouter()
  const [formState, setFormState] = useState<FormState>(() =>
    getInitialState(supplier)
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
      contactName: formState.contactName,
      email: formState.email,
      phone: formState.phone,
      taxId: formState.taxId,
      paymentTerms: formState.paymentTerms,
      notes: formState.notes,
      isActive: formState.isActive,
    }

    const schema =
      mode === "create" ? createSupplierSchema : updateSupplierSchema
    const parsed = schema.safeParse(payload)

    if (!parsed.success) {
      setFieldErrors(mapFieldErrors(parsed.error.flatten().fieldErrors))
      setIsSubmitting(false)
      return
    }

    const result =
      mode === "create"
        ? await createSupplierAction(parsed.data)
        : await updateSupplierAction(supplier!.id, parsed.data)

    setIsSubmitting(false)

    if (!result.success) {
      if (result.error.fieldErrors) {
        setFieldErrors(mapFieldErrors(result.error.fieldErrors))
      }

      setFormError(result.error.message)
      return
    }

    router.push(`/suppliers/${result.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Información del proveedor</CardTitle>
          <CardDescription>
            Datos de contacto y facturación de este proveedor.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Nombre
            </label>
            <Input
              id="name"
              value={formState.name}
              onChange={(event) => updateField("name", event.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="contactName" className="mb-1 block text-sm font-medium">
              Nombre de contacto
            </label>
            <Input
              id="contactName"
              value={formState.contactName}
              onChange={(event) => updateField("contactName", event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Correo electrónico
            </label>
            <Input
              id="email"
              type="email"
              value={formState.email}
              onChange={(event) => updateField("email", event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium">
              Teléfono
            </label>
            <Input
              id="phone"
              value={formState.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="taxId" className="mb-1 block text-sm font-medium">
              RFC / ID fiscal
            </label>
            <Input
              id="taxId"
              value={formState.taxId}
              onChange={(event) => updateField("taxId", event.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="paymentTerms" className="mb-1 block text-sm font-medium">
              Condiciones de pago
            </label>
            <Input
              id="paymentTerms"
              value={formState.paymentTerms}
              onChange={(event) => updateField("paymentTerms", event.target.value)}
              placeholder="Neto 30, contra entrega, etc."
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="mb-1 block text-sm font-medium">
              Notas
            </label>
            <Textarea
              id="notes"
              value={formState.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) => updateField("isActive", event.target.checked)}
                className="size-4 rounded border-input"
              />
              Proveedor activo
            </label>
          </div>
        </CardContent>
      </Card>

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" isDisabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
          {mode === "create" ? "Crear proveedor" : "Guardar cambios"}
        </Button>
        <LinkButton href={mode === "edit" ? `/suppliers/${supplier!.id}` : "/suppliers"} variant="outline">
          Cancelar
        </LinkButton>
      </div>
    </form>
  )
}
