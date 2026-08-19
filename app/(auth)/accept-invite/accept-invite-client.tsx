"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Sparkles } from "lucide-react"

import {
  activateInvitedAccountAction,
  establishInviteSessionAction,
  getInviteActivationPageAction,
} from "@/app/actions/invitations"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { APP_NAME } from "@/lib/i18n/branding"
import { createClient } from "@/lib/supabase/client"
import type { InviteActivationPageState } from "@/lib/auth/invite-activation"
import { activateInviteSchema } from "@/lib/validations/invitation.schema"

function mapPasswordSetupError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes("same as the old password")) {
    return "Elige una contraseña diferente a la temporal."
  }

  if (normalized.includes("password")) {
    return "No se pudo establecer la contraseña. Inténtalo de nuevo."
  }

  return "No se pudo activar la cuenta. Inténtalo de nuevo."
}

export default function AcceptInviteClientPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationId = searchParams.get("invitation")
  const callbackError = searchParams.get("error")
  const tokenHash = searchParams.get("token_hash")
  const inviteType = searchParams.get("type")
  const code = searchParams.get("code")

  const [pageState, setPageState] = useState<InviteActivationPageState | null>(
    null
  )
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false

    async function loadPageState() {
      setIsLoading(true)
      setFormError(null)

      if (tokenHash && inviteType) {
        const sessionResult = await establishInviteSessionAction({
          tokenHash,
          type: inviteType,
          invitationId,
        })

        if (cancelled) {
          return
        }

        if (!sessionResult.success) {
          setPageState({
            status: "auth_callback_failed",
            message: sessionResult.error.message,
          })
          setIsLoading(false)
          return
        }

        router.replace(
          invitationId
            ? `/accept-invite?invitation=${invitationId}`
            : "/accept-invite"
        )
        return
      } else if (code) {
        const sessionResult = await establishInviteSessionAction({
          code,
          invitationId,
        })

        if (cancelled) {
          return
        }

        if (!sessionResult.success) {
          setPageState({
            status: "auth_callback_failed",
            message: sessionResult.error.message,
          })
          setIsLoading(false)
          return
        }

        router.replace(
          invitationId
            ? `/accept-invite?invitation=${invitationId}`
            : "/accept-invite"
        )
        return
      } else {
        await createClient().auth.getSession()
      }

      const result = await getInviteActivationPageAction({
        invitationId,
        callbackError,
      })

      if (cancelled) {
        return
      }

      if (!result.success) {
        setPageState({
          status: "invalid",
          message: result.error.message,
        })
        setIsLoading(false)
        return
      }

      setPageState(result.data)
      setIsLoading(false)
    }

    void loadPageState()

    return () => {
      cancelled = true
    }
  }, [
    invitationId,
    callbackError,
    tokenHash,
    inviteType,
    code,
    router,
  ])

  async function handleActivateAccount() {
    if (pageState?.status !== "needs_password") {
      return
    }

    setFormError(null)
    setFieldErrors({})

    const parsed = activateInviteSchema.safeParse({
      invitationId: pageState.invitationId,
      password,
      confirmPassword,
    })

    if (!parsed.success) {
      const nextFieldErrors: Record<string, string[]> = {}

      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "form"
        nextFieldErrors[key] = [...(nextFieldErrors[key] ?? []), issue.message]
      }

      setFieldErrors(nextFieldErrors)
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: passwordError } = await supabase.auth.updateUser({
        password: parsed.data.password,
      })

      if (passwordError) {
        setFormError(mapPasswordSetupError(passwordError.message))
        return
      }

      const result = await activateInvitedAccountAction({
        invitationId: parsed.data.invitationId,
      })

      if (!result.success) {
        setFormError(result.error.message)
        return
      }

      router.push("/dashboard")
      router.refresh()
    })
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Validando invitación…
        </CardContent>
      </Card>
    )
  }

  if (!pageState || pageState.status !== "needs_password") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5" />
            Invitación no disponible
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {pageState?.message ?? "Enlace inválido."}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5" />
          Unirse a {APP_NAME}
        </CardTitle>
        <CardDescription>
          Crea tu contraseña para activar la cuenta{" "}
          <span className="font-medium text-foreground">{pageState.email}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {formError && (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Crear contraseña</h2>
          <label className="text-sm text-muted-foreground" htmlFor="password">
            Nueva contraseña
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password?.[0] && (
            <p className="text-sm text-destructive">{fieldErrors.password[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            className="text-sm text-muted-foreground"
            htmlFor="confirm-password"
          >
            Confirmar contraseña
          </label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
          />
          {fieldErrors.confirmPassword?.[0] && (
            <p className="text-sm text-destructive">
              {fieldErrors.confirmPassword[0]}
            </p>
          )}
        </div>

        <Button
          className="w-full"
          isDisabled={isPending}
          onPress={() => {
            void handleActivateAccount()
          }}
        >
          {isPending && (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          )}
          Activar cuenta
        </Button>
      </CardContent>
    </Card>
  )
}
