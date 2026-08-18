"use client"

import { useTransition } from "react"
import { Loader2 } from "lucide-react"

import { logoutAction } from "@/app/actions/auth"
import type { AuthenticatedUser } from "@/lib/auth/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type UserMenuProps = {
  user: AuthenticatedUser
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return "?"
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

export function UserMenu({ user }: UserMenuProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full bg-muted font-medium"
        aria-label="Menú de usuario"
        isDisabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          getInitials(user.fullName)
        )}
      </Button>
      <DropdownMenu placement="bottom end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{user.fullName}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {user.email} · {user.role === "admin" ? "Administrador" : "Empleado"}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem id="profile" isDisabled>
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem id="settings" isDisabled={user.role !== "admin"}>
          Configuración
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          id="logout"
          variant="destructive"
          isDisabled={isPending}
          onAction={() => {
            startTransition(async () => {
              await logoutAction()
            })
          }}
        >
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}
