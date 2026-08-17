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
        title="New supplier"
        description="Add a supplier with contact and payment details."
      />

      <SupplierForm mode="create" />
    </>
  )
}
