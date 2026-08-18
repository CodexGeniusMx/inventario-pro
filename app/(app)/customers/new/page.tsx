import { redirect } from "next/navigation"

import { CustomerForm } from "@/components/customers/customer-form"
import { PageHeader } from "@/components/layout/page-header"
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"

export default async function NewCustomerPage() {
  const user = await requirePermission("customers", "read")

  if (!hasPermission(user, "customers", "write")) {
    redirect("/customers")
  }

  return (
    <>
      <PageHeader
        title="Nuevo cliente"
        description="Agrega un registro de cliente para ventas futuras."
      />

      <CustomerForm mode="create" />
    </>
  )
}
