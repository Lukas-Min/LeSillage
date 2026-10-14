import type { Fulfillment, ProductType } from "@/db/schema";
import type { ProductListTab } from "@/components/admin/products-skeleton";
import { isArchivedProduct } from "@/domain/product-archive";
import { matchesProductSearch } from "@/lib/product-search";

/**
 * The admin Products list's tab + search, shared by the list page and the
 * product page's Previous/Next, so both walk the exact same list in the
 * exact same order. The product page gets the tab and search from its own
 * URL (`?type=…&q=…`), which the list's card links carry.
 */

/** Products per page on the list. */
export const ADMIN_PRODUCTS_PAGE_SIZE = 20;

export function parseProductListTab(value: string | null | undefined): ProductListTab {
  return value === "DECANT" || value === "FULL_BOTTLE" || value === "PARTIAL" || value === "ARCHIVED" ? value : "ALL";
}

function listParams(tab: ProductListTab, query: string): URLSearchParams {
  const params = new URLSearchParams();
  if (tab !== "ALL") params.set("type", tab);
  if (query) params.set("q", query);
  return params;
}

/** The list page itself, on `page` (1 = no param). */
export function adminProductsListHref(tab: ProductListTab, query: string, page = 1): string {
  const params = listParams(tab, query);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/products${qs ? `?${qs}` : ""}`;
}

/** One product's page, remembering which tab and search it was opened from. */
export function adminProductHref(productId: string, tab: ProductListTab, query: string): string {
  const qs = listParams(tab, query).toString();
  return `/admin/products/${productId}${qs ? `?${qs}` : ""}`;
}

/**
 * Splits off archived products (they only show under Archived), keeps the
 * tab's products, applies the search (the shop's matching:
 * `matchesProductSearch`), and sorts alphabetically by brand, then name.
 */
export function buildAdminProductList<
  P extends { id: string; type: ProductType; brand: string; name: string; isActive: boolean },
  S extends { productId: string; isActive: boolean; fulfillment: Fulfillment; stock: number },
>(productRows: P[], skuRows: S[], tab: ProductListTab, query: string) {
  const skusByProduct = new Map<string, S[]>();
  for (const sku of skuRows) {
    const list = skusByProduct.get(sku.productId);
    if (list) list.push(sku);
    else skusByProduct.set(sku.productId, [sku]);
  }
  const archivedIds = new Set(
    productRows.filter((p) => isArchivedProduct(p, skusByProduct.get(p.id) ?? [])).map((p) => p.id),
  );
  const liveRows = productRows.filter((p) => !archivedIds.has(p.id));
  let filtered =
    tab === "ARCHIVED"
      ? productRows.filter((p) => archivedIds.has(p.id))
      : tab === "ALL"
        ? liveRows
        : liveRows.filter((p) => p.type === tab);
  if (query) filtered = filtered.filter((p) => matchesProductSearch(query, p));
  filtered = [...filtered].sort((a, b) => {
    const byBrand = a.brand.localeCompare(b.brand, undefined, { sensitivity: "base" });
    if (byBrand !== 0) return byBrand;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return { skusByProduct, archivedIds, liveRows, filtered };
}
