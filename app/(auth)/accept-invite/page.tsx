import { Suspense } from "react"

import AcceptInviteClientPage from "./accept-invite-client"

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Cargando invitación…</div>}>
      <AcceptInviteClientPage />
    </Suspense>
  )
}
