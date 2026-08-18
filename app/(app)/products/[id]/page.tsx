import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { ArchiveProductButton } from "@/components/products/archive-product-button"
import { ProductStatusBadge } from "@/components/products/product-status-badge"
import { PageHeader } from "@/components/layout/page-header"
import { LinkButton } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { hasPermission } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/session"
import { NotFoundError } from "@/lib/errors/app-error"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { getProductById } from "@/services/catalog/product.service"

type ProductDetailPageProps = {
  params: Promise<{ id: string }>
}

function displayPrice(
  override: number | null,
  fallback: number
): number {
  return override ?? fallback
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const user = await requirePermission("products", "read")
  const canWrite = hasPermission(user, "products", "write")
  const { id } = await params

  let product

  try {
    product = await getProductById(user, id)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }

    throw error
  }

  return (
    <>
      <PageHeader
        title={product.name}
        description={product.description ?? "Detalles del producto y variantes."}
        actions={
          canWrite && product.status === "active" ? (
            <div className="flex items-center gap-2">
              <LinkButton href={`/products/${product.id}/edit`} variant="outline">
                <Pencil data-icon="inline-start" />
                Editar
              </LinkButton>
              <ArchiveProductButton
                productId={product.id}
                productName={product.name}
              />
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Información del producto</CardTitle>
                <CardDescription>
                  Metadatos del catálogo y precios base.
                </CardDescription>
              </div>
              <ProductStatusBadge status={product.status} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Categoría</p>
              <p className="font-medium">{product.categoryName ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unidad de medida</p>
              <p className="font-medium">{product.unitOfMeasure}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Precio de costo base</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(product.baseCostPrice)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Precio de venta base</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(product.baseSalePrice)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Creado</p>
              <p className="font-medium">{formatDateTime(product.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Última actualización</p>
              <p className="font-medium">{formatDateTime(product.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>
              {product.variants.length} variant
              {product.variants.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link href="/products" className="text-primary hover:underline">
                Volver a productos
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Variantes</CardTitle>
          <CardDescription>
            SKU, código de barras y precios por variante. El stock se administra en Inventario.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table aria-label="Variantes de producto">
            <TableHeader>
              <TableHead isRowHeader id="variant">
                Variante
              </TableHead>
              <TableHead id="sku">SKU</TableHead>
              <TableHead id="barcode">Código de barras</TableHead>
              <TableHead id="cost" className="text-right">
                Costo
              </TableHead>
              <TableHead id="salePrice" className="text-right">
                Precio de venta
              </TableHead>
              <TableHead id="reorderPoint" className="text-right">
                Punto de reorden
              </TableHead>
              <TableHead id="status">Estado</TableHead>
            </TableHeader>
            <TableBody>
              {product.variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell>{variant.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {variant.sku}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {variant.barcode ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(
                      displayPrice(variant.costPrice, product.baseCostPrice)
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(
                      displayPrice(variant.salePrice, product.baseSalePrice)
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {variant.reorderPoint}
                  </TableCell>
                  <TableCell>
                    {variant.isActive ? "Activo" : "Inactivo"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
