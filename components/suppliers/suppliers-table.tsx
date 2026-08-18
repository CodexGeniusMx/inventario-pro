import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatRelativeTime } from "@/lib/format"
import type { SupplierRow } from "@/types/suppliers"

type SuppliersTableProps = {
  suppliers: SupplierRow[]
}

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table aria-label="Proveedores">
        <TableHeader>
          <TableHead isRowHeader id="name">
            Nombre
          </TableHead>
          <TableHead id="contact" className="hidden md:table-cell">
            Contacto
          </TableHead>
          <TableHead id="email" className="hidden lg:table-cell">
            Correo electrónico
          </TableHead>
          <TableHead id="phone" className="hidden xl:table-cell">
            Teléfono
          </TableHead>
          <TableHead id="paymentTerms" className="hidden lg:table-cell">
            Condiciones de pago
          </TableHead>
          <TableHead id="status">Estado</TableHead>
          <TableHead id="updated" className="hidden sm:table-cell">
            Actualizado
          </TableHead>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell>
                <Link
                  href={`/suppliers/${supplier.id}`}
                  className="font-medium hover:underline"
                >
                  {supplier.name}
                </Link>
                {supplier.taxId && (
                  <p className="text-xs text-muted-foreground">
                    Tax ID: {supplier.taxId}
                  </p>
                )}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {supplier.contactName ?? "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {supplier.email ?? "—"}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                {supplier.phone ?? "—"}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {supplier.paymentTerms ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={supplier.isActive ? "default" : "secondary"}>
                  {supplier.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {formatRelativeTime(new Date(supplier.updatedAt))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
