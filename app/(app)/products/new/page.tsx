import { PageHeader } from "@/components/layout/page-header"
import { ProductForm } from "@/components/products/product-form"
import {
  canManageCategories,
  canManageUnits,
  canViewProductCosts,
} from "@/lib/auth/product-permissions"
import { requireProductPageAccess } from "@/app/actions/products"
import { listCategories } from "@/services/catalog/category.service"
import { listOrganizationUnits } from "@/services/catalog/unit.service"

export default async function NewProductPage() {
  const user = await requireProductPageAccess("create")

  const [categories, units] = await Promise.all([
    listCategories(user),
    listOrganizationUnits(user),
  ])

  return (
    <>
      <PageHeader
        title="Nuevo producto"
        description="Crea un producto con una variante predeterminada para comenzar a vender y rastrear inventario."
      />
      <ProductForm
        mode="create"
        categories={categories}
        units={units}
        canViewCost={canViewProductCosts(user)}
        canManageCategories={canManageCategories(user)}
        canManageUnits={canManageUnits(user)}
      />
    </>
  )
}
