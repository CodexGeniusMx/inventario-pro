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

const queryErrorMessages: Record<string, string> = {
  missing_profile:
    "Your account exists but is not linked to an organization yet. Contact an administrator.",
  inactive: "Your account has been deactivated.",
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryError = searchParams.get("error")
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard"

  const [formError, setFormError] = useState<string | null>(
    queryError ? (queryErrorMessages[queryError] ?? null) : null
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
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
      setFormError("Unable to connect. Check your network and try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to access Inventario Pro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email?.[0] && (
              <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
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
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
