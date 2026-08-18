import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requirePermission } from "@/lib/auth/session"
import { REPORT_DEFINITIONS } from "@/types/reports"

export default async function ReportsPage() {
  await requirePermission("reports", "read")

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Reportes de negocio con filtros y exportación CSV."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_DEFINITIONS.map((report) => (
          <Link key={report.slug} href={`/reports/${report.slug}`}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
