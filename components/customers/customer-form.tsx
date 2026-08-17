"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import {
  createCustomerAction,
  updateCustomerAction,
} from "@/app/actions/customers"
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
  createCustomerSchema,
  updateCustomerSchema,
} from "@/lib/validations/customer.schema"
import type { CustomerDetail } from "@/types/customers"

type CustomerFormProps = {
  mode: "create" | "edit"
  customer?: CustomerDetail
}

type FormState = {
  name: string
  email: string
  phone: string
  taxId: string
  notes: string
  isActive: boolean
}

function getInitialState(customer?: CustomerDetail): FormState {
  return {
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    taxId: customer?.taxId ?? "",
    notes: customer?.notes ?? "",
    isActive: customer?.isActive ?? true,
  }
}

function mapFieldErrors(
  fieldErrors: Record<string, string[]>
): Record<string, string> {
  const mapped: Record<string, string> = {}

  for (const [key, messages] of Object.entries(fieldErrors)) {
    mapped[key] = messages[0] ?? "Invalid value."
  }

  return mapped
}

export function CustomerForm({ mode, customer }: CustomerFormProps) {
  const router = useRouter()
  const [formState, setFormState] = useState<FormState>(() =>
    getInitialState(customer)
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
      email: formState.email,
      phone: formState.phone,
      taxId: formState.taxId,
      notes: formState.notes,
      isActive: formState.isActive,
    }

    const schema =
      mode === "create" ? createCustomerSchema : updateCustomerSchema
    const parsed = schema.safeParse(payload)

    if (!parsed.success) {
      setFieldErrors(mapFieldErrors(parsed.error.flatten().fieldErrors))
      setIsSubmitting(false)
      return
    }

    const result =
      mode === "create"
        ? await createCustomerAction(parsed.data)
        : await updateCustomerAction(customer!.id, parsed.data)

    setIsSubmitting(false)

    if (!result.success) {
      if (result.error.fieldErrors) {
        setFieldErrors(mapFieldErrors(result.error.fieldErrors))
      }

      setFormError(result.error.message)
      return
    }

    router.push(`/customers/${result.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Customer information</CardTitle>
          <CardDescription>Contact details for this customer.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Name
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
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
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
              Phone
            </label>
            <Input
              id="phone"
              value={formState.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="taxId" className="mb-1 block text-sm font-medium">
              Tax ID
            </label>
            <Input
              id="taxId"
              value={formState.taxId}
              onChange={(event) => updateField("taxId", event.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="mb-1 block text-sm font-medium">
              Notes
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
              Active customer
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
          {mode === "create" ? "Create customer" : "Save changes"}
        </Button>
        <LinkButton
          href={mode === "edit" ? `/customers/${customer!.id}` : "/customers"}
          variant="outline"
        >
          Cancel
        </LinkButton>
      </div>
    </form>
  )
}
