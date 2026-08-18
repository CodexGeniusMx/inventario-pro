"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Sparkles } from "lucide-react"

import { acceptInviteAction } from "@/app/actions/invitations"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { APP_NAME } from "@/lib/i18n/branding"

export default function AcceptInviteClientPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationId = searchParams.get("invitation")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!invitationId) {
      setError("Invitación no válida.")
    }
  }, [invitationId])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5" />
          Unirse a {APP_NAME}
        </CardTitle>
        <CardDescription>
          Acepta la invitación para activar tu cuenta en la organización.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          className="w-full"
          isDisabled={!invitationId || isPending}
          onPress={() => {
            if (!invitationId) return
            startTransition(async () => {
              const result = await acceptInviteAction(invitationId)
              if (!result.success) {
                setError(result.error.message)
                return
              }
              router.push("/dashboard")
              router.refresh()
            })
          }}
        >
          {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Activar cuenta
        </Button>
      </CardContent>
    </Card>
  )
}
