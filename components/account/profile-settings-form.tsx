"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { updateProfileAction } from "@/app/actions/account"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getRoleLabel } from "@/lib/auth/roles"
import type { ProfileSummary } from "@/services/preferences/user-preferences.service"

type ProfileSettingsFormProps = {
  profile: ProfileSummary
}

export function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
  const [fullName, setFullName] = useState(profile.fullName)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi perfil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="profile-full-name">
            Nombre completo
          </label>
          <Input
            id="profile-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">Correo</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Rol</p>
            <p className="text-sm text-muted-foreground">
              {getRoleLabel(profile.role)}
            </p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <p className="text-sm font-medium">Empresa</p>
            <p className="text-sm text-muted-foreground">
              {profile.organizationName}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <Button
          isDisabled={isPending}
          onPress={() => {
            setError(null)
            setMessage(null)
            startTransition(async () => {
              const result = await updateProfileAction({ fullName })
              if (!result.success) {
                setError(result.error.message)
                return
              }
              setMessage(result.data.message)
            })
          }}
        >
          {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Guardar perfil
        </Button>
      </CardContent>
    </Card>
  )
}
