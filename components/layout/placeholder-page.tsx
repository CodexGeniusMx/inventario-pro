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
          <p className="text-sm font-medium">Module coming soon</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            This section will be implemented in a future development phase.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
