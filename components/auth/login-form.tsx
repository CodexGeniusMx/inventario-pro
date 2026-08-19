"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { loginAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { loginSchema, type LoginInput } from "@/lib/validations/auth.schema"
import { APP_NAME } from "@/lib/i18n/branding"

const queryErrorMessages: Record<string, string> = {
  missing_profile:
    "Tu cuenta existe pero aún no está vinculada a una organización. Contacta a un administrador.",
  inactive: "Tu cuenta ha sido desactivada.",
}

const querySuccessMessages: Record<string, string> = {
  activated: "Cuenta activada. Ya puedes iniciar sesión.",
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryError = searchParams.get("error")
  const queryMessage = searchParams.get("message")
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard"

  const [formError, setFormError] = useState<string | null>(
    queryError ? (queryErrorMessages[queryError] ?? null) : null
  )
  const [formMessage, setFormMessage] = useState<string | null>(
    queryMessage ? (querySuccessMessages[queryMessage] ?? null) : null
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFormMessage(null)
    setFieldErrors({})
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const input: LoginInput = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    }

    const clientValidation = loginSchema.safeParse(input)

    if (!clientValidation.success) {
      const nextFieldErrors: Record<string, string[]> = {}

      for (const issue of clientValidation.error.issues) {
        const key = issue.path[0]?.toString() ?? "form"
        nextFieldErrors[key] = [...(nextFieldErrors[key] ?? []), issue.message]
      }

      setFieldErrors(nextFieldErrors)
      setIsSubmitting(false)
      return
    }

    try {
      const result = await loginAction(clientValidation.data)

      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors)
        }

        setFormError(result.error.message)
        setIsSubmitting(false)
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch {
      setFormError("No se pudo conectar. Verifica tu red e inténtalo de nuevo.")
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder a {APP_NAME}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {formMessage && (
            <div
              className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
              role="status"
            >
              {formMessage}
            </div>
          )}

          {formError && (
            <div
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Correo electrónico
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@empresa.com"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email?.[0] && (
              <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password?.[0] && (
              <p className="text-sm text-destructive">
                {fieldErrors.password[0]}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" isDisabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" />
                Iniciando sesión…
              </>
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
