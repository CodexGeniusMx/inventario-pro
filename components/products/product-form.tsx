"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import {
  createProductAction,
  updateProductAction,
} from "@/app/actions/products"
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
import { createProductSchema } from "@/lib/validations/product.schema"
import type { CategoryOption, ProductDetail } from "@/types/catalog"

type ProductFormProps = {
  mode: "create" | "edit"
  categories: CategoryOption[]
  product?: ProductDetail
}

type FormState = {
  name: string
  description: string
  categoryId: string
  unitOfMeasure: string
  baseCostPrice: string
  baseSalePrice: string
  variantName: string
  sku: string
  barcode: string
  variantCostPrice: string
  variantSalePrice: string
  reorderPoint: string
}

function getInitialState(product?: ProductDetail): FormState {
  const variant = product?.variants[0]

  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    categoryId: product?.categoryId ?? "",
    unitOfMeasure: product?.unitOfMeasure ?? "unit",
    baseCostPrice: product ? String(product.baseCostPrice) : "0",
    baseSalePrice: product ? String(product.baseSalePrice) : "0",
    variantName: variant?.name ?? "Default",
    sku: variant?.sku ?? "",
    barcode: variant?.barcode ?? "",
    variantCostPrice:
      variant?.costPrice !== null && variant?.costPrice !== undefined
        ? String(variant.costPrice)
        : "",
    variantSalePrice:
      variant?.salePrice !== null && variant?.salePrice !== undefined
        ? String(variant.salePrice)
        : "",
    reorderPoint: String(variant?.reorderPoint ?? 0),
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

export function ProductForm({ mode, categories, product }: ProductFormProps) {
  const router = useRouter()
  const [formState, setFormState] = useState<FormState>(() =>
    getInitialState(product)
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
      description: formState.description,
      categoryId: formState.categoryId,
      unitOfMeasure: formState.unitOfMeasure,
      baseCostPrice: formState.baseCostPrice,
      baseSalePrice: formState.baseSalePrice,
      variant: {
        name: formState.variantName,
        sku: formState.sku,
        barcode: formState.barcode,
        costPrice: formState.variantCostPrice,
        salePrice: formState.variantSalePrice,
        reorderPoint: formState.reorderPoint,
      },
    }

    const parsed = createProductSchema.safeParse(payload)

    if (!parsed.success) {
      const nextFieldErrors: Record<string, string[]> = {}

      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form"
        nextFieldErrors[key] = [...(nextFieldErrors[key] ?? []), issue.message]
      }

      setFieldErrors(mapFieldErrors(nextFieldErrors))
      setIsSubmitting(false)
      return
    }

    const result =
      mode === "create"
        ? await createProductAction(parsed.data)
        : await updateProductAction(product!.id, {
            ...parsed.data,
            variant: {
              ...parsed.data.variant,
              id: product!.variants[0]?.id,
            },
          })

    if (!result.success) {
      if (result.error.fieldErrors) {
        setFieldErrors(mapFieldErrors(result.error.fieldErrors))
      }

      setFormError(result.error.message)
      setIsSubmitting(false)
      return
    }

    router.push(`/products/${result.data.id}`)
    router.refresh()
  }

  function fieldError(path: string): string | undefined {
    return fieldErrors[path]
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
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
          <CardTitle>Product details</CardTitle>
          <CardDescription>
            Basic catalog information shared across variants.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="name" className="text-sm font-medium">
              Product name
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

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              rows={3}
              value={formState.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="categoryId" className="text-sm font-medium">
              Category
            </label>
            <select
              id="categoryId"
              value={formState.categoryId}
              onChange={(event) =>
                updateField("categoryId", event.target.value)
              }
              className="flex h-8 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              disabled={isSubmitting}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="unitOfMeasure" className="text-sm font-medium">
              Unit of measure
            </label>
            <Input
              id="unitOfMeasure"
              placeholder="unit"
              value={formState.unitOfMeasure}
              onChange={(event) =>
                updateField("unitOfMeasure", event.target.value)
              }
              aria-invalid={Boolean(fieldError("unitOfMeasure"))}
              disabled={isSubmitting}
            />
            {fieldError("unitOfMeasure") && (
              <p className="text-sm text-destructive">
                {fieldError("unitOfMeasure")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="baseCostPrice" className="text-sm font-medium">
              Base cost price
            </label>
            <Input
              id="baseCostPrice"
              type="number"
              min="0"
              step="0.01"
              value={formState.baseCostPrice}
              onChange={(event) =>
                updateField("baseCostPrice", event.target.value)
              }
              aria-invalid={Boolean(fieldError("baseCostPrice"))}
              disabled={isSubmitting}
            />
            {fieldError("baseCostPrice") && (
              <p className="text-sm text-destructive">
                {fieldError("baseCostPrice")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="baseSalePrice" className="text-sm font-medium">
              Base sale price
            </label>
            <Input
              id="baseSalePrice"
              type="number"
              min="0"
              step="0.01"
              value={formState.baseSalePrice}
              onChange={(event) =>
                updateField("baseSalePrice", event.target.value)
              }
              aria-invalid={Boolean(fieldError("baseSalePrice"))}
              disabled={isSubmitting}
            />
            {fieldError("baseSalePrice") && (
              <p className="text-sm text-destructive">
                {fieldError("baseSalePrice")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default variant</CardTitle>
          <CardDescription>
            SKU, barcode, and pricing for the initial variant.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="variantName" className="text-sm font-medium">
              Variant name
            </label>
            <Input
              id="variantName"
              value={formState.variantName}
              onChange={(event) =>
                updateField("variantName", event.target.value)
              }
              aria-invalid={Boolean(fieldError("variant.name"))}
              disabled={isSubmitting}
            />
            {fieldError("variant.name") && (
              <p className="text-sm text-destructive">
                {fieldError("variant.name")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="sku" className="text-sm font-medium">
              SKU
            </label>
            <Input
              id="sku"
              value={formState.sku}
              onChange={(event) => updateField("sku", event.target.value)}
              aria-invalid={Boolean(fieldError("variant.sku"))}
              disabled={isSubmitting}
            />
            {fieldError("variant.sku") && (
              <p className="text-sm text-destructive">
                {fieldError("variant.sku")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="barcode" className="text-sm font-medium">
              Barcode
            </label>
            <Input
              id="barcode"
              value={formState.barcode}
              onChange={(event) => updateField("barcode", event.target.value)}
              aria-invalid={Boolean(fieldError("variant.barcode"))}
              disabled={isSubmitting}
            />
            {fieldError("variant.barcode") && (
              <p className="text-sm text-destructive">
                {fieldError("variant.barcode")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="variantCostPrice" className="text-sm font-medium">
              Variant cost override
            </label>
            <Input
              id="variantCostPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="Uses base cost if empty"
              value={formState.variantCostPrice}
              onChange={(event) =>
                updateField("variantCostPrice", event.target.value)
              }
              aria-invalid={Boolean(fieldError("variant.costPrice"))}
              disabled={isSubmitting}
            />
            {fieldError("variant.costPrice") && (
              <p className="text-sm text-destructive">
                {fieldError("variant.costPrice")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="variantSalePrice" className="text-sm font-medium">
              Variant sale override
            </label>
            <Input
              id="variantSalePrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="Uses base sale if empty"
              value={formState.variantSalePrice}
              onChange={(event) =>
                updateField("variantSalePrice", event.target.value)
              }
              aria-invalid={Boolean(fieldError("variant.salePrice"))}
              disabled={isSubmitting}
            />
            {fieldError("variant.salePrice") && (
              <p className="text-sm text-destructive">
                {fieldError("variant.salePrice")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="reorderPoint" className="text-sm font-medium">
              Reorder point
            </label>
            <Input
              id="reorderPoint"
              type="number"
              min="0"
              step="1"
              value={formState.reorderPoint}
              onChange={(event) =>
                updateField("reorderPoint", event.target.value)
              }
              aria-invalid={Boolean(fieldError("variant.reorderPoint"))}
              disabled={isSubmitting}
            />
            {fieldError("variant.reorderPoint") && (
              <p className="text-sm text-destructive">
                {fieldError("variant.reorderPoint")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" isDisabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              Saving…
            </>
          ) : mode === "create" ? (
            "Create product"
          ) : (
            "Save changes"
          )}
        </Button>
        <LinkButton
          href={product ? `/products/${product.id}` : "/products"}
          variant="outline"
        >
          Cancel
        </LinkButton>
      </div>
    </form>
  )
}
