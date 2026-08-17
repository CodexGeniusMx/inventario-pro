import { notFound, redirect } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { ReturnForm } from "@/components/returns/return-form"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { NotFoundError, ValidationError } from "@/lib/errors/app-error"
import { getSaleReturnContext } from "@/services/returns/return.service"

type SaleReturnPageProps = {
  params: Promise<{ id: string }>
}

export default async function SaleReturnPage({ params }: SaleReturnPageProps) {
  const user = await requirePermission("returns", "read")

  if (!hasPermission(user, "returns", "write")) {
    redirect(`/sales/${(await params).id}`)
  }

  const { id } = await params

  let sale

  try {
    sale = await getSaleReturnContext(user, id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }

    if (error instanceof ValidationError) {
      return (
        <>
          <PageHeader
            title="Process return"
            description="Return items from a completed sale."
          />
          <Card>
            <CardHeader>
              <CardTitle>Return not available</CardTitle>
              <CardDescription>{error.message}</CardDescription>
            </CardHeader>
          </Card>
        </>
      )
    }

    throw error
  }

  if (sale.lines.length === 0) {
    return (
      <>
        <PageHeader
          title="Process return"
          description="Return items from a completed sale."
        />
        <Card>
          <CardHeader>
            <CardTitle>Nothing left to return</CardTitle>
            <CardDescription>
              All items on sale {sale.documentNumber} have already been fully
              returned.
            </CardDescription>
          </CardHeader>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Return ${sale.documentNumber}`}
        description="Select sale lines, quantities, and restock options. Inventory and totals are validated server-side."
      />

      <ReturnForm sale={sale} />
    </>
  )
}
