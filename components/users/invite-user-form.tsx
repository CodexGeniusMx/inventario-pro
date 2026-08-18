"use client"

import { useState, useTransition } from "react"
import { Loader2, UserPlus } from "lucide-react"

import { inviteUserAction } from "@/app/actions/users"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { INVITABLE_ROLES, getRoleLabel } from "@/lib/auth/roles"
import type { AppRole } from "@/lib/auth/types"

export function InviteUserForm() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<AppRole>("seller")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitar usuario</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="invite-email">
            Correo
          </label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="empleado@empresa.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="invite-role">
            Rol
          </label>
          <select
            id="invite-role"
            className="flex h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as AppRole)}
          >
            {INVITABLE_ROLES.map((item) => (
              <option key={item} value={item}>
                {getRoleLabel(item)}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Button
          isDisabled={isPending}
          onPress={() => {
            setError(null)
            setMessage(null)
            startTransition(async () => {
              const result = await inviteUserAction({ email, role })
              if (!result.success) {
                setError(result.error.message)
                return
              }
              setEmail("")
              setMessage(result.data.message)
            })
          }}
        >
          {isPending ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <UserPlus data-icon="inline-start" />
          )}
          Enviar invitación
        </Button>
      </CardContent>
    </Card>
  )
}
