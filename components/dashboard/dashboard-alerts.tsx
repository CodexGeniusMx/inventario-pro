"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, LinkButton, buttonVariants } from "@/components/ui/button"
import type { LowStockProduct } from "@/lib/mock/dashboard"

type LowStockAlertProps = {
  lowStockCount: number
  outOfStockCount: number
  products: LowStockProduct[]
}

export function LowStockAlert({
  lowStockCount,
  outOfStockCount,
  products,
}: LowStockAlertProps) {
  if (lowStockCount === 0 && outOfStockCount === 0) {
    return null
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-950">
            {lowStockCount} products low on stock
            {outOfStockCount > 0 && ` · ${outOfStockCount} out of stock`}
          </p>
          <p className="text-sm text-amber-900/80">
            {products.slice(0, 2).map((product, index) => (
              <span key={product.sku}>
                {index > 0 && ", "}
                {product.product} ({product.onHand} left)
              </span>
            ))}
            {products.length > 2 && ` and ${products.length - 2} more`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100">
          Action needed
        </Badge>
        <Link
          href="/inventory"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          View inventory
        </Link>
      </div>
    </div>
  )
}

type QuickActionsProps = {
  className?: string
}

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <div className={className}>
      <p className="mb-2 text-sm font-medium">Quick actions</p>
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/sales/new" size="sm">
          New sale
        </LinkButton>
        <Button variant="outline" size="sm" isDisabled>
          Receive PO
        </Button>
        <Button variant="outline" size="sm" isDisabled>
          Adjust stock
        </Button>
        <Link href="/reports">
          <Button variant="outline" size="sm">
            View reports
          </Button>
        </Link>
      </div>
    </div>
  )
}
