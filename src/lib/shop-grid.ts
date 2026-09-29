/**
 * /shop page size by grid width. The grid (catalog-grid.tsx) is 1, 2, 3, 4,
 * or 5 columns wide; 20 fills whole rows at every width except 3, where it
 * would end on a lone pair, so the three-column range gets 21. The server
 * can't see the screen, so ShopGridSync records "is the grid three columns
 * right now" in this cookie and the page reads it.
 */
export const SHOP_COLS_COOKIE = "shop_cols";

/** Must match catalog-grid.tsx: sm:grid-cols-3 until lg:grid-cols-4. */
export const THREE_COLUMN_QUERY = "(min-width: 640px) and (max-width: 1023.98px)";

export function shopPageSize(threeColumns: boolean): number {
  return threeColumns ? 21 : 20;
}
