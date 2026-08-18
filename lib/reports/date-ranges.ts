import type { ReportDatePreset } from "@/types/reports"

import {
  addZonedDays,
  formatZonedDateLabel,
  formatZonedHeadingDate,
  iterateZonedDays,
  normalizeTimeZone,
  startOfNextZonedMonth,
  startOfZonedDay,
  startOfZonedMonth,
} from "@/lib/reports/timezone"

export type DateRange = {
  from: Date
  to: Date
  preset: ReportDatePreset
  label: string
  timeZone: string
}

export function resolveReportDateRange(input: {
  preset?: ReportDatePreset
  from?: string
  to?: string
  now?: Date
  timeZone?: string
}): DateRange {
  const now = input.now ?? new Date()
  const timeZone = normalizeTimeZone(input.timeZone)
  const todayStart = startOfZonedDay(now, timeZone)
  const tomorrowStart = addZonedDays(todayStart, 1, timeZone)
  const preset = input.preset ?? "last_30_days"

  if (preset === "custom" && input.from && input.to) {
    const fromDate = new Date(`${input.from}T12:00:00.000Z`)
    const toDate = new Date(`${input.to}T12:00:00.000Z`)

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return resolveReportDateRange({ preset: "last_30_days", now, timeZone })
    }

    const from = startOfZonedDay(fromDate, timeZone)
    const inclusiveTo = addZonedDays(startOfZonedDay(toDate, timeZone), 1, timeZone)

    return {
      from,
      to: inclusiveTo,
      preset,
      timeZone,
      label: `${input.from} a ${input.to}`,
    }
  }

  switch (preset) {
    case "today":
      return {
        from: todayStart,
        to: tomorrowStart,
        preset,
        timeZone,
        label: "Hoy",
      }
    case "last_7_days":
      return {
        from: addZonedDays(todayStart, -6, timeZone),
        to: tomorrowStart,
        preset,
        timeZone,
        label: "Últimos 7 días",
      }
    case "this_month":
      return {
        from: startOfZonedMonth(now, timeZone),
        to: startOfNextZonedMonth(now, timeZone),
        preset,
        timeZone,
        label: "Este mes",
      }
    case "last_30_days":
    default:
      return {
        from: addZonedDays(todayStart, -29, timeZone),
        to: tomorrowStart,
        preset: "last_30_days",
        timeZone,
        label: "Últimos 30 días",
      }
  }
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null
  }

  return ((current - previous) / previous) * 100
}

export function formatChartDayLabel(dateIso: string, timeZone = "UTC"): string {
  const [year, month, day] = dateIso.split("-").map(Number)

  if (!year || !month || !day) {
    return dateIso
  }

  return formatZonedDateLabel(year, month, day, timeZone)
}

export function formatDashboardHeadingDate(
  now = new Date(),
  timeZone = "UTC"
): string {
  return formatZonedHeadingDate(now, timeZone)
}

export function buildChartDayKeys(from: Date, to: Date, timeZone: string) {
  return iterateZonedDays(from, to, timeZone)
}
