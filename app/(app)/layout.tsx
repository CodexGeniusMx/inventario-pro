import { AppLayoutClient } from "@/components/layout/app-layout-client"
import { requireUserOrRedirect } from "@/lib/auth/session"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUserOrRedirect("/login")

  return <AppLayoutClient user={user}>{children}</AppLayoutClient>
}
