import { LinkButton } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ProductNotFound() {
  return (
    <Card className="mx-auto max-w-lg border-dashed">
      <CardHeader className="text-center">
        <CardTitle>Product not found</CardTitle>
        <CardDescription>
          This product may have been removed or you do not have access to it.
        </CardDescription>
        <LinkButton href="/products" className="mt-4">
          Back to products
        </LinkButton>
      </CardHeader>
    </Card>
  )
}
