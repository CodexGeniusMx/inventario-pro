/**
 * Variant price resolution: NULL override means inherit from product base.
 * Zero is a valid explicit override value.
 */
export function resolveVariantCostPrice(
  variantCostPrice: number | null | undefined,
  baseCostPrice: number
): number {
  return variantCostPrice ?? baseCostPrice
}

export function resolveVariantSalePrice(
  variantSalePrice: number | null | undefined,
  baseSalePrice: number
): number {
  return variantSalePrice ?? baseSalePrice
}

export function variantInheritsCost(variantCostPrice: number | null | undefined): boolean {
  return variantCostPrice === null || variantCostPrice === undefined
}

export function variantInheritsSalePrice(
  variantSalePrice: number | null | undefined
): boolean {
  return variantSalePrice === null || variantSalePrice === undefined
}
