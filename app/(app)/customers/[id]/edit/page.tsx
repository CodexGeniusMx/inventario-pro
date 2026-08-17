import { notFound, redirect } from "next/navigation"

import { CustomerForm } from "@/components/customers/customer-form"
import { PageHeader } from "@/components/layout/page-header"
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { NotFoundError } from "@/lib/errors/app-error"
import { getCustomerById } from "@/services/parties/customer.service"

type EditCustomerPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const user = await requirePermission("customers", "read")

  if (!hasPermission(user, "customers", "write")) {
    redirect("/customers")
  }

  const { id } = await params

  let customer

  try {
    customer = await getCustomerById(user, id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }

    throw error
  }

  return (
    <>
      <PageHeader
        title={`Edit ${customer.name}`}
        description="Update customer contact details."
      />

      <CustomerForm mode="edit" customer={customer} />
    </>
  )
}
