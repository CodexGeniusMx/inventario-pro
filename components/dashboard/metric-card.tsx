import type { LucideIcon } from "lucide-react"
import { TrendingDown, TrendingUp } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format"

type MetricCardProps = {
  title: string
  value: string
  subtitle?: string
  change?: number
  icon?: LucideIcon
  variant?: "default" | "warning" | "danger"
  className?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  variant = "default",
  className,
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <Card size="sm" className={cn("py-4", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon
            className={cn(
              "size-4",
              variant === "warning" && "text-amber-600",
              variant === "danger" && "text-destructive",
              variant === "default" && "text-muted-foreground"
            )}
            aria-hidden="true"
          />
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums tracking-tight",
            variant === "warning" && "text-amber-600",
            variant === "danger" && "text-destructive"
          )}
        >
          {value}
        </p>
        {(subtitle || change !== undefined) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {subtitle && <span>{subtitle}</span>}
            {change !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  isPositive ? "text-emerald-600" : "text-destructive"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {formatPercent(change)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type MetricCardCurrencyProps = {
  title: string
  amount: number
  subtitle?: string
  change?: number
  icon?: LucideIcon
  variant?: "default" | "warning" | "danger"
}

export function MetricCardCurrency({
  title,
  amount,
  subtitle,
  change,
  icon,
  variant,
}: MetricCardCurrencyProps) {
  return (
    <MetricCard
      title={title}
      value={formatCurrency(amount)}
      subtitle={subtitle}
      change={change}
      icon={icon}
      variant={variant}
    />
  )
}

type MetricCardCountProps = {
  title: string
  count: number
  subtitle?: string
  icon?: LucideIcon
  variant?: "default" | "warning" | "danger"
}

export function MetricCardCount({
  title,
  count,
  subtitle,
  icon,
  variant,
}: MetricCardCountProps) {
  return (
    <MetricCard
      title={title}
      value={formatNumber(count)}
      subtitle={subtitle}
      icon={icon}
      variant={variant}
    />
  )
}
