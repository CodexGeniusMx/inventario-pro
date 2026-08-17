export function resolveSalePrice(
  variantSalePrice: number | null | undefined,
  baseSalePrice: number | null | undefined
): number {
  if (variantSalePrice != null && variantSalePrice > 0) {
    return variantSalePrice
  }

  return Number(baseSalePrice ?? 0)
}

export function resolveCostPrice(
  variantCostPrice: number | null | undefined,
  baseCostPrice: number | null | undefined
): number {
  if (variantCostPrice != null && variantCostPrice > 0) {
    return variantCostPrice
  }

  return Number(baseCostPrice ?? 0)
}
