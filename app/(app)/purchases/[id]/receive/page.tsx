import { notFound, redirect } from "next/navigation"

import { ReceivePurchaseForm } from "@/components/purchases/receive-purchase-form"
import { PageHeader } from "@/components/layout/page-header"
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { NotFoundError } from "@/lib/errors/app-error"
import { getPurchaseOrderById } from "@/services/purchasing/purchase.service"

type ReceivePurchasePageProps = {
  params: Promise<{ id: string }>
}

export default async function ReceivePurchasePage({
  params,
}: ReceivePurchasePageProps) {
  const user = await requirePermission("purchases", "read")

  if (!hasPermission(user, "purchases", "receive") || user.role !== "admin") {
    redirect("/purchases")
  }

  const { id } = await params

  let purchase

  try {
    purchase = await getPurchaseOrderById(user, id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }

    throw error
  }

  if (
    purchase.status !== "ordered" &&
    purchase.status !== "partially_received"
  ) {
    redirect(`/purchases/${purchase.id}`)
  }

  return (
    <>
      <PageHeader
        title={`Receive ${purchase.documentNumber}`}
        description="Record received quantities and update inventory atomically."
      />

      <ReceivePurchaseForm purchaseOrder={purchase} />
    </>
  )
}
