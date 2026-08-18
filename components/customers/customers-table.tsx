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
import type { CustomerRow } from "@/types/customers"

type CustomersTableProps = {
  customers: CustomerRow[]
}

export function CustomersTable({ customers }: CustomersTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table aria-label="Clientes">
        <TableHeader>
          <TableHead isRowHeader id="name">
            Nombre
          </TableHead>
          <TableHead id="email" className="hidden md:table-cell">
            Correo electrónico
          </TableHead>
          <TableHead id="phone" className="hidden lg:table-cell">
            Teléfono
          </TableHead>
          <TableHead id="taxId" className="hidden xl:table-cell">
            RFC / ID fiscal
          </TableHead>
          <TableHead id="status">Estado</TableHead>
          <TableHead id="updated" className="hidden sm:table-cell">
            Actualizado
          </TableHead>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <Link
                  href={`/customers/${customer.id}`}
                  className="font-medium hover:underline"
                >
                  {customer.name}
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {customer.email ?? "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {customer.phone ?? "—"}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                {customer.taxId ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={customer.isActive ? "default" : "secondary"}>
                  {customer.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {formatRelativeTime(new Date(customer.updatedAt))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
