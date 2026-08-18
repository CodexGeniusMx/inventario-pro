type ReportExportButtonProps = {
  slug: string
  searchParams: Record<string, string | undefined>
}

export function ReportExportButton({
  slug,
  searchParams,
}: ReportExportButtonProps) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      params.set(key, value)
    }
  }

  const href = `/api/reports/${slug}/export?${params.toString()}`

  return (
    <a
      href={href}
      className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
    >
      Exportar CSV
    </a>
  )
}
