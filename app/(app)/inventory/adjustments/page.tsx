import { Plus } from "lucide-react"

import { AdjustmentsTable } from "@/components/inventory/adjustments-table"
import { InventoryErrorState } from "@/components/inventory/inventory-error-state"
import { InventorySubNav } from "@/components/inventory/inventory-sub-nav"
import { PageHeader } from "@/components/layout/page-header"
import { LinkButton } from "@/components/ui/button"
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { listAdjustments } from "@/services/inventory/inventory.service"

export default async function AdjustmentsPage() {
  const user = await requirePermission("inventory", "read")
  const canAdjust = hasPermission(user, "inventory", "adjust")

  let adjustments: Awaited<ReturnType<typeof listAdjustments>> = []
  let loadError: string | null = null

  try {
    adjustments = await listAdjustments(user)
  } catch {
    loadError = "Unable to load stock adjustments."
  }

  return (
    <>
      <PageHeader
        title="Stock adjustments"
        description="Controlled stock changes that create inventory movement records."
        actions={
          canAdjust ? (
            <LinkButton href="/inventory/adjustments/new">
              <Plus data-icon="inline-start" />
              New adjustment
            </LinkButton>
          ) : undefined
        }
      />

      <InventorySubNav />

      {loadError ? (
        <InventoryErrorState message={loadError} />
      ) : adjustments.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No adjustments yet.
          {canAdjust && (
            <div className="mt-4">
              <LinkButton href="/inventory/adjustments/new">
                Create first adjustment
              </LinkButton>
            </div>
          )}
        </div>
      ) : (
        <AdjustmentsTable adjustments={adjustments} />
      )}
    </>
  )
}
