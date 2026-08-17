import { AlertCircle } from "lucide-react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ProductsErrorStateProps = {
  message?: string
}

export function ProductsErrorState({
  message = "Unable to load products. Please refresh and try again.",
}: ProductsErrorStateProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="space-y-1">
            <CardTitle className="text-base text-destructive">
              Something went wrong
            </CardTitle>
            <CardDescription className="text-destructive/80">
              {message}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
