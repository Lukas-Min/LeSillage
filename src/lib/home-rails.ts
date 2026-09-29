import { cache } from "react";
import { compareCardNames, loadCatalogCards, type CatalogCardModel } from "@/lib/catalog";

const RAIL_SIZE = 10;
/** New arrivals and decants cap each brand so one big drop (e.g. 19 Velixir
 *  bottles added the same day) can't fill a whole rail. Deals don't: a
 *  brand-wide markdown is exactly what that rail is for. */
const PER_BRAND_CAP = 2;

export interface HomeRails {
  deals: CatalogCardModel[];
  newArrivals: CatalogCardModel[];
  decants: CatalogCardModel[];
}

function pick(
  cards: CatalogCardModel[],
  shown: Set<string>,
  perBrandCap = Number.POSITIVE_INFINITY,
): CatalogCardModel[] {
  const picked: CatalogCardModel[] = [];
  const perBrand = new Map<string, number>();
  for (const card of cards) {
    if (picked.length >= RAIL_SIZE) break;
    if (shown.has(card.productId)) continue;
    const count = perBrand.get(card.brand) ?? 0;
    if (count >= perBrandCap) continue;
    perBrand.set(card.brand, count + 1);
    shown.add(card.productId);
    picked.push(card);
  }
  return picked;
}

/**
 * The homepage's product rails, picked in page order (deals, then new
 * arrivals, then decants) from one cached catalog read, so no product shows
 * up in two rails. React `cache` shares the result between the rails'
 * separate Suspense boundaries within a request.
 */
export const loadHomeRails = cache(async (): Promise<HomeRails> => {
  // "newest" keeps the query's createdAt-desc order; sold-out listings
  // can't be bought, so they don't get homepage space.
  const cards = (await loadCatalogCards({ sort: "newest" })).filter((card) => !card.soldOut);
  const shown = new Set<string>();
  const deals = pick(
    // Biggest saving first, equal savings A-Z (the shop's discount sort).
    cards
      .filter((card) => card.hasDiscount)
      .sort((a, b) => (b.savePercent ?? 0) - (a.savePercent ?? 0) || compareCardNames(a, b)),
    shown,
  );
  const newArrivals = pick(cards, shown, PER_BRAND_CAP);
  const decants = pick(
    cards
      .filter((card) => card.type === "DECANT")
      .sort((a, b) => (b.ratingValue ?? -1) - (a.ratingValue ?? -1) || compareCardNames(a, b)),
    shown,
    PER_BRAND_CAP,
  );
  return { deals, newArrivals, decants };
});
