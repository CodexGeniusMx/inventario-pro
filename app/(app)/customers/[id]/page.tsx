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
import { getCustomerById } from "@/services/parties/customer.service"

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const user = await requirePermission("customers", "read")
  const canWrite = hasPermission(user, "customers", "write")
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
        title={customer.name}
        description="Customer profile and contact information."
        actions={
          canWrite ? (
            <LinkButton href={`/customers/${customer.id}/edit`} variant="outline">
              <Pencil data-icon="inline-start" />
              Edit
            </LinkButton>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Customer details</CardTitle>
            <CardDescription>
              <Badge variant={customer.isActive ? "default" : "secondary"}>
                {customer.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{customer.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{customer.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tax ID</p>
              <p className="font-medium">{customer.taxId ?? "—"}</p>
            </div>
            {customer.notes && (
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{customer.notes}</p>
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
              <Link href="/customers" className="text-primary hover:underline">
                Back to customers
              </Link>
            </p>
            <p>
              <Link href="/sales" className="text-primary hover:underline">
                View sales
              </Link>
            </p>
            <div className="pt-2 text-muted-foreground">
              <p>Created {formatDateTime(customer.createdAt)}</p>
              <p>Updated {formatDateTime(customer.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
