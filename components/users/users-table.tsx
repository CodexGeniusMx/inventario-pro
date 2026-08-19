"use client"

import { useTransition } from "react"

import {
  updateUserRoleAction,
  updateUserStatusAction,
} from "@/app/actions/users"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getRoleLabel } from "@/lib/auth/roles"
import type { AppRole } from "@/lib/auth/types"
import type { OrganizationUser } from "@/types/settings"

type UsersTableProps = {
  users: OrganizationUser[]
}

const editableRoles: AppRole[] = [
  "admin",
  "manager",
  "seller",
  "warehouse",
  "read_only",
  "employee",
]

export function UsersTable({ users }: UsersTableProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <Table aria-label="Usuarios de la organización">
      <TableHeader>
        <TableHead isRowHeader id="name">
          Nombre
        </TableHead>
        <TableHead id="email">Correo</TableHead>
        <TableHead id="role">Rol</TableHead>
        <TableHead id="status">Estado</TableHead>
        <TableHead id="actions" className="text-right">
          Acciones
        </TableHead>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.fullName}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <select
                className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
                value={user.role}
                disabled={user.role === "owner" || isPending}
                onChange={(event) => {
                  startTransition(async () => {
                    await updateUserRoleAction({
                      userId: user.id,
                      role: event.target.value as AppRole,
                    })
                  })
                }}
              >
                {editableRoles.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
                {user.role === "owner" && (
                  <option value="owner">{getRoleLabel("owner")}</option>
                )}
              </select>
            </TableCell>
            <TableCell>
              <Badge variant={user.isActive ? "secondary" : "outline"}>
                {user.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant="outline"
                isDisabled={user.role === "owner" || isPending}
                onPress={() => {
                  startTransition(async () => {
                    await updateUserStatusAction({
                      userId: user.id,
                      isActive: !user.isActive,
                    })
                  })
                }}
              >
                {user.isActive ? "Desactivar" : "Activar"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
