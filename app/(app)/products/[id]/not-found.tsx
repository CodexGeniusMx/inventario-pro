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
        <CardTitle>Producto no encontrado</CardTitle>
        <CardDescription>
          Este producto puede haber sido eliminado o no tienes acceso a él.
        </CardDescription>
        <LinkButton href="/products" className="mt-4">
          Volver a productos
        </LinkButton>
      </CardHeader>
    </Card>
  )
}
