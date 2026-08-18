export function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ""
  }

  const stringValue = String(value)

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`
  }

  return stringValue
}

export function buildCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ]

  return `${lines.join("\n")}\n`
}
