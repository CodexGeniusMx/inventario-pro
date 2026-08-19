"use client"

import { useState, useTransition } from "react"
import { Loader2, Mail, XCircle } from "lucide-react"

import {
  cancelInvitationAction,
  resendInvitationAction,
} from "@/app/actions/users"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getRoleLabel } from "@/lib/auth/roles"
import { formatDateTime } from "@/lib/format"
import { invitationStatusLabel } from "@/lib/i18n/status-labels"
import { getEffectiveInvitationStatus } from "@/lib/users/invitations"
import type { UserInvitation } from "@/types/settings"

type PendingInvitationsListProps = {
  invitations: UserInvitation[]
}

export function PendingInvitationsList({
  invitations,
}: PendingInvitationsListProps) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<UserInvitation | null>(null)
  const [isPending, startTransition] = useTransition()

  function clearMessages() {
    setFeedback(null)
    setError(null)
  }

  function handleResend(invitationId: string) {
    clearMessages()
    startTransition(async () => {
      const result = await resendInvitationAction({ invitationId })
      if (!result.success) {
        setError(result.error.message)
        return
      }
      setFeedback(result.data.message)
    })
  }

  function handleCancelConfirm() {
    if (!cancelTarget) {
      return
    }

    clearMessages()
    startTransition(async () => {
      const result = await cancelInvitationAction({
        invitationId: cancelTarget.id,
      })

      if (!result.success) {
        setError(result.error.message)
        return
      }

      setCancelTarget(null)
      setFeedback(result.data.message)
    })
  }

  return (
    <>
      {feedback && (
        <p className="mb-3 text-sm text-muted-foreground">{feedback}</p>
      )}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="space-y-3">
        {invitations.map((invitation) => {
          const effectiveStatus = getEffectiveInvitationStatus(invitation)
          const isExpired = effectiveStatus === "expired"

          return (
            <div
              key={invitation.id}
              className="flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{invitation.email}</p>
                  <Badge variant={isExpired ? "outline" : "secondary"}>
                    {invitationStatusLabel(effectiveStatus)}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Rol: {getRoleLabel(invitation.role)}
                </p>
                <p className="text-muted-foreground">
                  Enviada el {formatDateTime(invitation.createdAt)}
                </p>
                <p className={isExpired ? "text-destructive" : "text-muted-foreground"}>
                  {isExpired ? "Expiró" : "Expira"} el{" "}
                  {formatDateTime(invitation.expiresAt)}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  isDisabled={isPending}
                  onPress={() => handleResend(invitation.id)}
                >
                  {isPending ? (
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                  ) : (
                    <Mail data-icon="inline-start" />
                  )}
                  Reenviar invitación
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  isDisabled={isPending}
                  onPress={() => {
                    clearMessages()
                    setCancelTarget(invitation)
                  }}
                >
                  <XCircle data-icon="inline-start" />
                  Cancelar invitación
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog
        isOpen={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setCancelTarget(null)
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Cancelar invitación</DialogTitle>
          <DialogDescription>
            {cancelTarget ? (
              <>
                Se cancelará la invitación para{" "}
                <span className="font-medium text-foreground">
                  {cancelTarget.email}
                </span>
                . Esta acción no afecta usuarios activos. Para invitar otro
                correo, envía una nueva invitación después de cancelar.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            isDisabled={isPending}
            onPress={() => setCancelTarget(null)}
          >
            Volver
          </Button>
          <Button
            variant="destructive"
            isDisabled={isPending}
            onPress={handleCancelConfirm}
          >
            {isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            Confirmar cancelación
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
