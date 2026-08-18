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
        description="Perfil del proveedor e información de contacto."
        actions={
          canWrite ? (
            <LinkButton href={`/suppliers/${supplier.id}/edit`} variant="outline">
              <Pencil data-icon="inline-start" />
              Editar
            </LinkButton>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detalles del proveedor</CardTitle>
            <CardDescription>
              <Badge variant={supplier.isActive ? "default" : "secondary"}>
                {supplier.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Nombre de contacto</p>
              <p className="font-medium">{supplier.contactName ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Correo electrónico</p>
              <p className="font-medium">{supplier.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{supplier.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">RFC / ID fiscal</p>
              <p className="font-medium">{supplier.taxId ?? "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">Condiciones de pago</p>
              <p className="font-medium">{supplier.paymentTerms ?? "—"}</p>
            </div>
            {supplier.notes && (
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="font-medium">{supplier.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relacionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link href="/suppliers" className="text-primary hover:underline">
                Volver a proveedores
              </Link>
            </p>
            <p>
              <Link href="/purchases" className="text-primary hover:underline">
                Ver órdenes de compra
              </Link>
            </p>
            <div className="pt-2 text-muted-foreground">
              <p>Creado {formatDateTime(supplier.createdAt)}</p>
              <p>Actualizado {formatDateTime(supplier.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
