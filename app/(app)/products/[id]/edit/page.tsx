import { notFound, redirect } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { ProductForm } from "@/components/products/product-form"
import { hasPermission } from "@/lib/auth/permissions"
import { requireUser } from "@/lib/auth/session"
import { NotFoundError } from "@/lib/errors/app-error"
import { listCategories } from "@/services/catalog/category.service"
import { getProductById } from "@/services/catalog/product.service"

type EditProductPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const user = await requireUser()

  if (!hasPermission(user, "products", "write")) {
    redirect("/products")
  }

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

  const categories = await listCategories(user)

  return (
    <>
      <PageHeader
        title={`Edit ${product.name}`}
        description="Update product details and variant pricing. Stock changes belong in Inventory."
      />
      <ProductForm mode="edit" categories={categories} product={product} />
    </>
  )
}
