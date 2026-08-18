import { redirect } from "next/navigation"

import { SupplierForm } from "@/components/suppliers/supplier-form"
import { PageHeader } from "@/components/layout/page-header"
import { requireAdmin } from "@/lib/auth/session"

export default async function NewSupplierPage() {
  try {
    await requireAdmin()
  } catch {
    redirect("/suppliers")
  }

  return (
    <>
      <PageHeader
        title="Nuevo proveedor"
        description="Agrega un proveedor con datos de contacto y pago."
      />

      <SupplierForm mode="create" />
    </>
  )
}
