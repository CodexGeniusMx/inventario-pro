import { notFound, redirect } from "next/navigation"

import { SupplierForm } from "@/components/suppliers/supplier-form"
import { PageHeader } from "@/components/layout/page-header"
import { requireAdmin } from "@/lib/auth/session"
import { NotFoundError } from "@/lib/errors/app-error"
import { getSupplierById } from "@/services/parties/supplier.service"

type EditSupplierPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditSupplierPage({ params }: EditSupplierPageProps) {
  let user

  try {
    user = await requireAdmin()
  } catch {
    redirect("/suppliers")
  }

  const { id } = await params

  let supplier

  try {
    supplier = await getSupplierById(user, id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }

    throw error
  }

  return (
    <>
      <PageHeader
        title={`Editar ${supplier.name}`}
        description="Actualiza datos de contacto y facturación del proveedor."
      />

      <SupplierForm mode="edit" supplier={supplier} />
    </>
  )
}
