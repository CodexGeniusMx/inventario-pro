import { notFound, redirect } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { ProductForm } from "@/components/products/product-form"
import {
  canManageCategories,
  canManageUnits,
  canViewProductCosts,
} from "@/lib/auth/product-permissions"
import { requireProductPageAccess } from "@/app/actions/products"
import { NotFoundError } from "@/lib/errors/app-error"
import { listCategories } from "@/services/catalog/category.service"
import { getProductById } from "@/services/catalog/product.service"
import { listOrganizationUnits } from "@/services/catalog/unit.service"

type EditProductPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const user = await requireProductPageAccess("edit")
  const { id } = await params

  let product

  try {
    product = await getProductById(user, id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }

    throw error
  }

  if (product.status === "archived") {
    redirect(`/products/${id}`)
  }

  const [categories, units] = await Promise.all([
    listCategories(user),
    listOrganizationUnits(user),
  ])

  return (
    <>
      <PageHeader
        title={`Editar ${product.name}`}
        description="Actualiza detalles del producto y precios de variantes. Los cambios de stock pertenecen a Inventario."
      />
      <ProductForm
        mode="edit"
        categories={categories}
        units={units}
        canViewCost={canViewProductCosts(user)}
        canManageCategories={canManageCategories(user)}
        canManageUnits={canManageUnits(user)}
        product={product}
      />
    </>
  )
}
