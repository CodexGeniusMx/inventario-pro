"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Loader2, Settings2, Shield, UserRound } from "lucide-react"

import { logoutAction } from "@/app/actions/auth"
import { canManageRolePermissions, canManageSettings } from "@/lib/auth/permissions"
import { getRoleLabel } from "@/lib/auth/roles"
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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const showOrganizationSettings = canManageSettings(user)
  const showPermissionEditor = canManageRolePermissions(user)

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
      <DropdownMenu placement="bottom end" className="w-60">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{user.fullName}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {user.email} · {getRoleLabel(user.role)}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          id="account-profile"
          onAction={() => router.push("/account/profile")}
        >
          <UserRound data-icon="inline-start" />
          Mi perfil
        </DropdownMenuItem>
        <DropdownMenuItem
          id="account-appearance"
          onAction={() => router.push("/account/appearance")}
        >
          Apariencia
        </DropdownMenuItem>
        <DropdownMenuItem
          id="account-accessibility"
          onAction={() => router.push("/account/accessibility")}
        >
          Accesibilidad
        </DropdownMenuItem>
        <DropdownMenuItem
          id="account-notifications"
          onAction={() => router.push("/account/notifications")}
        >
          Notificaciones
        </DropdownMenuItem>
        <DropdownMenuItem
          id="account-security"
          onAction={() => router.push("/account/security")}
        >
          <Shield data-icon="inline-start" />
          Seguridad
        </DropdownMenuItem>
        {showOrganizationSettings && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              id="organization-settings"
              onAction={() => router.push("/settings")}
            >
              <Settings2 data-icon="inline-start" />
              Administrar empresa
            </DropdownMenuItem>
          </>
        )}
        {showPermissionEditor && (
          <DropdownMenuItem
            id="organization-permissions"
            onAction={() => router.push("/settings/permissions")}
          >
            Usuarios y permisos
          </DropdownMenuItem>
        )}
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
