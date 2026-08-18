import { Package2 } from "lucide-react"

import { APP_NAME, APP_COMPANY } from "@/lib/i18n/branding"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8 flex items-center gap-3">
        <Package2 className="size-7 text-primary" />
        <div>
          <p className="text-lg font-semibold tracking-tight">{APP_NAME}</p>
          <p className="text-sm text-muted-foreground">{APP_COMPANY}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
