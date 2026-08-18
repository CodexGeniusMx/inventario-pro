import { Construction } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"

type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card size="sm">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Construction className="mb-4 size-10 text-muted-foreground" />
          <p className="text-sm font-medium">Módulo próximamente</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Esta sección se implementará en una fase futura de desarrollo.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
