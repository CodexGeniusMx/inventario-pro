"use client"

import { useState } from "react"

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { KeepAiAssistant } from "@/components/keep-ai/keep-ai-assistant"
import type { AuthenticatedUser } from "@/lib/auth/types"
import { SheetContent } from "@/components/ui/sheet"

type AppShellProps = {
  title: string
  user: AuthenticatedUser
  children: React.ReactNode
}

export function AppShell({ title, user, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-svh w-full overflow-x-hidden bg-background">
      <div className="hidden lg:flex">
        <Sidebar
          user={user}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />
      </div>

      <SheetContent
        side="left"
        isOpen={mobileOpen}
        onOpenChange={setMobileOpen}
        className="w-60 p-0 lg:hidden"
        showCloseButton={false}
      >
        <Sidebar user={user} onNavigate={() => setMobileOpen(false)} />
      </SheetContent>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} user={user} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>

      <KeepAiAssistant user={user} />
    </div>
  )
}
