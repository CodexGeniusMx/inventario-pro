import { AccountNavClient } from "@/components/account/account-nav-client"
import { requireUserOrRedirect } from "@/lib/auth/session"

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireUserOrRedirect("/login")

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside>
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Mi cuenta
        </p>
        <AccountNavClient />
      </aside>
      <div>{children}</div>
    </div>
  )
}
