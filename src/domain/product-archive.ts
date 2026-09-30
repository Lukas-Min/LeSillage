/**
 * Whether a product is archived. "Archive or delete" (archiveOrDeleteProduct)
 * archives a product that has orders, cart entries or wishlist saves by
 * hiding it and switching every size off; there is no separate column. So a
 * hidden product whose sizes are all off is archived, and a hidden product
 * with a size still on (a fresh Fragrantica import waiting for its price) or
 * with no sizes yet (a draft) is just hidden.
 */
export function isArchivedProduct(
  product: { isActive: boolean },
  productSkus: readonly { isActive: boolean }[],
): boolean {
  return !product.isActive && productSkus.length > 0 && productSkus.every((sku) => !sku.isActive);
}
