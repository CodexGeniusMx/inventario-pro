const DEFAULT_TIME_ZONE = "UTC"

export function normalizeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone || timeZone.trim() === "") {
    return DEFAULT_TIME_ZONE
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone })
    return timeZone
  } catch {
    return DEFAULT_TIME_ZONE
  }
}

type ZonedDateParts = {
  year: number
  month: number
  day: number
}

function getZonedDateParts(instant: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant)

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "1970"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "1"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "1"),
  }
}

function getZonedHour(instant: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).format(instant)
  )
}

function zonedMidnightToUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string
): Date {
  let utcMs = Date.UTC(year, month - 1, day, 12, 0, 0)

  for (let attempt = 0; attempt < 72; attempt += 1) {
    const probe = new Date(utcMs)
    const parts = getZonedDateParts(probe, timeZone)
    const hour = getZonedHour(probe, timeZone)

    if (parts.year === year && parts.month === month && parts.day === day && hour === 0) {
      return probe
    }

    utcMs -= 60 * 60 * 1000
  }

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
}

export function startOfZonedDay(instant: Date, timeZone: string): Date {
  const normalized = normalizeTimeZone(timeZone)
  const parts = getZonedDateParts(instant, normalized)
  return zonedMidnightToUtc(parts.year, parts.month, parts.day, normalized)
}

export function addZonedDays(instant: Date, days: number, timeZone: string): Date {
  const normalized = normalizeTimeZone(timeZone)
  const parts = getZonedDateParts(instant, normalized)
  const anchor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0))
  return startOfZonedDay(anchor, normalized)
}

export function startOfZonedMonth(instant: Date, timeZone: string): Date {
  const normalized = normalizeTimeZone(timeZone)
  const parts = getZonedDateParts(instant, normalized)
  return zonedMidnightToUtc(parts.year, parts.month, 1, normalized)
}

export function startOfNextZonedMonth(instant: Date, timeZone: string): Date {
  const normalized = normalizeTimeZone(timeZone)
  const parts = getZonedDateParts(instant, normalized)
  const nextMonth = parts.month === 12 ? 1 : parts.month + 1
  const nextYear = parts.month === 12 ? parts.year + 1 : parts.year
  return zonedMidnightToUtc(nextYear, nextMonth, 1, normalized)
}

export function formatZonedDateLabel(
  year: number,
  month: number,
  day: number,
  timeZone: string
): string {
  const normalized = normalizeTimeZone(timeZone)
  const date = zonedMidnightToUtc(year, month, day, normalized)

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: normalized,
  })
}

export function formatZonedHeadingDate(now: Date, timeZone: string): string {
  const normalized = normalizeTimeZone(timeZone)

  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: normalized,
  })
}

export function iterateZonedDays(
  from: Date,
  to: Date,
  timeZone: string
): Array<{ key: string; year: number; month: number; day: number }> {
  const normalized = normalizeTimeZone(timeZone)
  const days: Array<{ key: string; year: number; month: number; day: number }> = []
  let cursor = startOfZonedDay(from, normalized)

  while (cursor < to) {
    const parts = getZonedDateParts(cursor, normalized)
    const key = `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
    days.push({ key, ...parts })
    cursor = addZonedDays(cursor, 1, normalized)
  }

  return days
}
