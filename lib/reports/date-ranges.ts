import type { ReportDatePreset } from "@/types/reports"

export type DateRange = {
  from: Date
  to: Date
  preset: ReportDatePreset
  label: string
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function startOfNextUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
}

export function resolveReportDateRange(input: {
  preset?: ReportDatePreset
  from?: string
  to?: string
  now?: Date
}): DateRange {
  const now = input.now ?? new Date()
  const todayStart = startOfUtcDay(now)
  const tomorrowStart = addUtcDays(todayStart, 1)
  const preset = input.preset ?? "last_30_days"

  if (preset === "custom" && input.from && input.to) {
    const from = new Date(input.from)
    const to = new Date(input.to)

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return resolveReportDateRange({ preset: "last_30_days", now })
    }

    const inclusiveTo = addUtcDays(startOfUtcDay(to), 1)

    return {
      from: startOfUtcDay(from),
      to: inclusiveTo,
      preset,
      label: `${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`,
    }
  }

  switch (preset) {
    case "today":
      return {
        from: todayStart,
        to: tomorrowStart,
        preset,
        label: "Today",
      }
    case "last_7_days":
      return {
        from: addUtcDays(todayStart, -6),
        to: tomorrowStart,
        preset,
        label: "Last 7 days",
      }
    case "this_month":
      return {
        from: startOfUtcMonth(now),
        to: startOfNextUtcMonth(now),
        preset,
        label: "This month",
      }
    case "last_30_days":
    default:
      return {
        from: addUtcDays(todayStart, -29),
        to: tomorrowStart,
        preset: "last_30_days",
        label: "Last 30 days",
      }
  }
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null
  }

  return ((current - previous) / previous) * 100
}

export function formatChartDayLabel(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`)

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function formatDashboardHeadingDate(now = new Date()): string {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}
