import type { Fulfillment, ProductType } from "@/db/schema";

/**
 * A partial is one opened bottle: once its stock is sold there's nothing left
 * to sell and nothing coming back. So a sold-out partial size is hidden from
 * the shop instead of shown "Sold out" (like an empty full bottle that isn't
 * taking pre-orders), and a partial with nothing left counts as archived. A
 * PRE_ORDER partial isn't sold out.
 */
export function isPartialSkuSoldOut(sku: { fulfillment: Fulfillment; stock: number }): boolean {
  return sku.fulfillment === "ON_HAND" && sku.stock <= 0;
}

/**
 * A visible partial whose every size is sold out or switched off. It's hidden
 * from the shop and listed under the admin's Archived tab until a size gets
 * stock again (an admin restock, or a cancelled order returning it). A hidden
 * partial is left alone: that's a draft still being set up, not a sale.
 */
export function isSoldOutPartial(
  product: { isActive: boolean; type: ProductType },
  productSkus: readonly { isActive: boolean; fulfillment: Fulfillment; stock: number }[],
): boolean {
  return (
    product.type === "PARTIAL" &&
    product.isActive &&
    productSkus.length > 0 &&
    productSkus.every((sku) => !sku.isActive || isPartialSkuSoldOut(sku))
  );
}

/**
 * Archived by hand: "Archive or delete" (archiveOrDeleteProduct) archives a
 * product that has orders, cart entries or wishlist saves by hiding it and
 * switching every size off; there is no separate column. So a hidden product
 * whose sizes are all off is archived, and a hidden product with a size still
 * on (a fresh Fragrantica import waiting for its price) or with no sizes yet
 * (a draft) is just hidden. Unarchive undoes this.
 */
export function isManuallyArchivedProduct(
  product: { isActive: boolean },
  productSkus: readonly { isActive: boolean }[],
): boolean {
  return !product.isActive && productSkus.length > 0 && productSkus.every((sku) => !sku.isActive);
}

/**
 * Whether a product belongs under the admin's Archived tab (and out of All
 * and its type tab): archived by hand, or a sold-out partial.
 */
export function isArchivedProduct(
  product: { isActive: boolean; type: ProductType },
  productSkus: readonly { isActive: boolean; fulfillment: Fulfillment; stock: number }[],
): boolean {
  return isManuallyArchivedProduct(product, productSkus) || isSoldOutPartial(product, productSkus);
}
