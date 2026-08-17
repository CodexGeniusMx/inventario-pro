import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { LinkButton } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { NotFoundError } from "@/lib/errors/app-error"
import { formatDateTime } from "@/lib/format"
import { getSupplierById } from "@/services/parties/supplier.service"

type SupplierDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function SupplierDetailPage({
  params,
}: SupplierDetailPageProps) {
  const user = await requirePermission("suppliers", "read")
  const canWrite = user.role === "admin" && hasPermission(user, "suppliers", "write")
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
        title={supplier.name}
        description="Supplier profile and contact information."
        actions={
          canWrite ? (
            <LinkButton href={`/suppliers/${supplier.id}/edit`} variant="outline">
              <Pencil data-icon="inline-start" />
              Edit
            </LinkButton>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Supplier details</CardTitle>
            <CardDescription>
              <Badge variant={supplier.isActive ? "default" : "secondary"}>
                {supplier.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Contact name</p>
              <p className="font-medium">{supplier.contactName ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{supplier.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{supplier.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tax ID</p>
              <p className="font-medium">{supplier.taxId ?? "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">Payment terms</p>
              <p className="font-medium">{supplier.paymentTerms ?? "—"}</p>
            </div>
            {supplier.notes && (
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{supplier.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link href="/suppliers" className="text-primary hover:underline">
                Back to suppliers
              </Link>
            </p>
            <p>
              <Link href="/purchases" className="text-primary hover:underline">
                View purchase orders
              </Link>
            </p>
            <div className="pt-2 text-muted-foreground">
              <p>Created {formatDateTime(supplier.createdAt)}</p>
              <p>Updated {formatDateTime(supplier.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
