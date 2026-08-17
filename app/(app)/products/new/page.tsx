import { redirect } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { ProductForm } from "@/components/products/product-form"
import { hasPermission } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { listCategories } from "@/services/catalog/category.service"

export default async function NewProductPage() {
  const user = await requireUser()

  if (!hasPermission(user, "products", "write")) {
    redirect("/products")
  }

  const categories = await listCategories(user)

  return (
    <>
      <PageHeader
        title="New product"
        description="Create a product with a default variant to start selling and tracking inventory."
      />
      <ProductForm mode="create" categories={categories} />
    </>
  )
}
