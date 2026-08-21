"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Loader2, RotateCcw, Search } from "lucide-react"

import {
  restoreRolePermissionsAction,
  saveRolePermissionsAction,
} from "@/app/actions/role-permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { getRoleLabel } from "@/lib/auth/roles"
import type { AppRole } from "@/lib/auth/types"
import {
  PERMISSION_GROUPS,
  permissionKey,
} from "@/lib/permissions/catalog"
import type { RolePermissionMatrix } from "@/services/permissions/role-permissions.service"

type RolePermissionEditorProps = {
  matrix: RolePermissionMatrix
}

export function RolePermissionEditor({ matrix }: RolePermissionEditorProps) {
  const initialState = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const permission of matrix.permissions) {
      map.set(permissionKey(permission.resource, permission.action), permission.granted)
    }
    return map
  }, [matrix.permissions])

  const protectedMap = useMemo(() => {
    const map = new Map<string, { protected: boolean; reason: string | null }>()
    for (const permission of matrix.permissions) {
      map.set(permissionKey(permission.resource, permission.action), {
        protected: permission.protected,
        reason: permission.protectedReason,
      })
    }
    return map
  }, [matrix.permissions])

  const idMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const permission of matrix.permissions) {
      map.set(permissionKey(permission.resource, permission.action), permission.permissionId)
    }
    return map
  }, [matrix.permissions])

  const [draft, setDraft] = useState(initialState)
  const [query, setQuery] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasChanges = useMemo(() => {
    for (const [key, value] of initialState.entries()) {
      if (draft.get(key) !== value) {
        return true
      }
    }
    return false
  }, [draft, initialState])

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return PERMISSION_GROUPS.map((group) => ({
      ...group,
      permissions: group.permissions.filter((permission) => {
        const key = permissionKey(permission.resource, permission.action)
        if (!idMap.has(key)) {
          return false
        }

        if (!normalized) {
          return true
        }

        return (
          permission.label.toLowerCase().includes(normalized) ||
          permission.description.toLowerCase().includes(normalized) ||
          permission.resource.toLowerCase().includes(normalized) ||
          permission.action.toLowerCase().includes(normalized)
        )
      }),
    })).filter((group) => group.permissions.length > 0)
  }, [idMap, query])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/settings/permissions" className="hover:underline">
              Roles
            </Link>
            {" / "}
            {getRoleLabel(matrix.role)}
          </p>
          <h2 className="text-xl font-semibold">{getRoleLabel(matrix.role)}</h2>
          <p className="text-sm text-muted-foreground">
            {matrix.overrideCount > 0
              ? `${matrix.overrideCount} permiso(s) personalizado(s) para esta empresa.`
              : "Usando permisos predeterminados globales."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            isDisabled={isPending}
            onPress={() => {
              setError(null)
              setMessage(null)
              startTransition(async () => {
                const result = await restoreRolePermissionsAction({ role: matrix.role })
                if (!result.success) {
                  setError(result.error.message)
                  return
                }
                window.location.reload()
              })
            }}
          >
            <RotateCcw data-icon="inline-start" />
            Restaurar permisos predeterminados
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar permisos..."
          className="pl-9"
          aria-label="Buscar permisos"
        />
      </div>

      {filteredGroups.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle>{group.label}</CardTitle>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.permissions.map((permission) => {
              const key = permissionKey(permission.resource, permission.action)
              const permissionId = idMap.get(key)
              const meta = protectedMap.get(key)
              const granted = draft.get(key) ?? false
              const isProtected = meta?.protected ?? false

              if (!permissionId) {
                return null
              }

              return (
                <div
                  key={key}
                  className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{permission.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {permission.description}
                    </p>
                    {isProtected && meta?.reason && (
                      <p className="text-xs text-muted-foreground">{meta.reason}</p>
                    )}
                  </div>

                  <Switch
                    isSelected={granted}
                    isDisabled={isProtected || isPending}
                    onChange={(value) => {
                      setDraft((current) => {
                        const next = new Map(current)
                        next.set(key, value)
                        return next
                      })
                    }}
                    aria-label={permission.label}
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          isDisabled={!hasChanges || isPending}
          onPress={() => {
            setError(null)
            setMessage(null)
            startTransition(async () => {
              const changes = Array.from(draft.entries())
                .filter(([key, granted]) => initialState.get(key) !== granted)
                .map(([key, granted]) => ({
                  permissionId: idMap.get(key)!,
                  granted,
                }))

              const result = await saveRolePermissionsAction({
                role: matrix.role,
                changes,
              })

              if (!result.success) {
                setError(result.error.message)
                return
              }

              setMessage(result.data.message)
              window.location.reload()
            })
          }}
        >
          {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar cambios
        </Button>

        <Button
          variant="outline"
          isDisabled={!hasChanges || isPending}
          onPress={() => setDraft(new Map(initialState))}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
