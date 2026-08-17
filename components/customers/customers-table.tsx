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
      <Table aria-label="Customers">
        <TableHeader>
          <TableHead isRowHeader id="name">
            Name
          </TableHead>
          <TableHead id="email" className="hidden md:table-cell">
            Email
          </TableHead>
          <TableHead id="phone" className="hidden lg:table-cell">
            Phone
          </TableHead>
          <TableHead id="taxId" className="hidden xl:table-cell">
            Tax ID
          </TableHead>
          <TableHead id="status">Status</TableHead>
          <TableHead id="updated" className="hidden sm:table-cell">
            Updated
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
                  {customer.isActive ? "Active" : "Inactive"}
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
