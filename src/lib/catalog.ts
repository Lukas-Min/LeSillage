import { and, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import {
  productDiscounts,
  productImages,
  products,
  promoSettings,
  skus,
  type Concentration,
  type Condition,
  type FragranceCategory,
  type Fulfillment,
  type Packaging,
  type ProductDiscount,
  type ProductType,
  type Provenance,
} from "@/db/schema";
import { applyDiscount, bestDiscount, withSiteWideDiscount } from "@/domain/discount";
import type { SiteWideDiscountConfig } from "@/domain/promo";
import { DECANT_SIZES_ML, decantFulfillment, DEFAULT_DECANT_PREORDER_THRESHOLD_ML } from "@/domain/decant";
import { labelForCondition, labelForPackaging, labelForProvenance } from "@/domain/product-type";
import { normaliseNotePyramid, type NotePyramid } from "@/lib/note-pyramid";
import { compareSkuOrder, type SizePickerOption, type VariantSubOption } from "@/domain/variant-options";

export const CATALOG_SORTS = [
  "newest",
  "rating",
  "discount_desc",
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export interface CatalogFilter {
  type?: ProductType;
  types?: ProductType[];
  fragranceCategory?: FragranceCategory;
  concentration?: Concentration;
  brand?: string;
  gender?: string;
  query?: string;
  sizeMl?: number;
  sort?: CatalogSort;
  limit?: number;
  /** Row to start returning from, for paging — see shop/page.tsx. Omit for
   *  existing non-paginated callers; behavior for them is unchanged. */
  offset?: number;
}

export interface CatalogCardModel {
  productId: string;
  skuId: string;
  name: string;
  brand: string;
  family: string | null;
  description: string | null;
  type: ProductType;
  fragranceCategory: FragranceCategory;
  concentration: Concentration | null;
  gender: string | null;
  ratingValue: number | null;
  href: string;
  imageUrl: string | null;
  imageAlt: string | null;
  notePyramid: NotePyramid | null;
  fulfillment: Fulfillment;
  soldOut: boolean;
  minOriginalCentavos: number;
  maxOriginalCentavos: number;
  minDiscountedCentavos: number;
  maxDiscountedCentavos: number;
  hasDiscount: boolean;
  savePercent: number | null;
  /** Every real size+provenance this product offers, for the shop-grid
   *  picker — always populated (even for a single-SKU product, so the size
   *  and provenance are always visible via this instead of a separate
   *  badge). A group's own `subOptions` carries condition/packaging
   *  alternatives within that size+provenance, only when there's more than
   *  one — see buildVariantOptions. */
  sizeOptions: SizePickerOption[];
}

interface SkuRow {
  productId: string;
  skuId: string;
  retailPrice: number;
  fulfillment: Fulfillment;
  stock: number;
  condition: (typeof skus.$inferSelect)["condition"];
  provenance: (typeof skus.$inferSelect)["provenance"];
  packaging: (typeof skus.$inferSelect)["packaging"];
  sizeMl: number | null;
  isActive: boolean;
  isTester: boolean;
}

/**
 * A RETAIL decant SKU is a distinct physical unit bought pre-made from the
 * perfumery — it uses its own fulfillment column directly, exactly like a
 * full-bottle SKU. Only an IN_HOUSE decant (poured to order from a whole
 * bottle) is computed from the product's shared remainingMl pool. Mirrors
 * effectiveFulfillment in src/lib/cart.ts, which the cart/checkout path uses
 * for the same decision — kept as a separate small helper here since this
 * file has no dependency on cart.ts and takes a slightly different shape of
 * input (a raw variant row, not cart-line args).
 */
function decantVariantFulfillment(
  variant: { fulfillment: Fulfillment; sizeMl: number | null; provenance: Provenance },
  remainingMl: number,
  thresholdMl: number,
): Fulfillment {
  if (variant.provenance === "RETAIL") return variant.fulfillment;
  return decantFulfillment({ remainingMl, sizeMl: variant.sizeMl ?? DECANT_SIZES_ML[0], thresholdMl });
}

// isTester is purely a backend eligibility flag for the free-tester promo
// draw (src/domain/promo.ts pickTester) — it does not change what the
// customer is buying, so it must never surface as a label or badge here.
function sizePickerGroupLabel(sizeMl: number, provenance: Provenance): string {
  return `${sizeMl}ML · ${labelForProvenance(provenance)}`;
}

function pricedForDisplay<T extends { retailPrice: number }>(variants: T[]): T[] {
  const positive = variants.filter((v) => v.retailPrice > 0);
  return positive.length > 0 ? positive : variants;
}

/**
 * Turns a product's raw SKU rows into priced, fulfillment-aware
 * `SizePickerOption[]` — grouped by size+provenance, with `isTester` carried
 * through purely for the free-tester promo draw and never used to split
 * groups or label a button (a tester-eligible bottle is not a different
 * product to the customer). Provenance is always baked into the group's
 * label. Condition/packaging become a secondary `subOptions` picker only
 * when a group has more than one SKU to distinguish. Shared by the shop grid
 * (`loadCatalogCards`), the PDP, and the cart drawer's "Customize" picker
 * (`getSiblingSkuOptions`) — pure (no DB access) so each call site fetches
 * `variants`/`discounts` however best fits its own query shape.
 */
export function buildVariantOptions(
  variants: Array<{
    skuId: string;
    sizeMl: number | null;
    retailPrice: number;
    fulfillment: Fulfillment;
    stock: number;
    condition: Condition;
    provenance: Provenance;
    packaging: Packaging;
    isTester?: boolean;
  }>,
  discounts: ProductDiscount[],
  opts: { isDecant: boolean; remainingMl: number; thresholdMl: number },
): SizePickerOption[] {
  const enriched = variants
    .filter((v) => v.sizeMl != null)
    .map((v) => {
      const applied = applyDiscount(v.retailPrice, bestDiscount(discounts, v.retailPrice));
      const fulfillment = opts.isDecant
        ? decantVariantFulfillment(v, opts.remainingMl, opts.thresholdMl)
        : v.fulfillment;
      const soldOut = (!opts.isDecant || v.provenance === "RETAIL") && fulfillment === "ON_HAND" && v.stock <= 0;
      const isTester = Boolean(v.isTester);
      return {
        ...v,
        isTester,
        fulfillment,
        soldOut,
        originalCentavos: v.retailPrice,
        discountedCentavos: applied.discountedUnitCentavos,
        savedCentavos: applied.perUnitDiscountCentavos,
      };
    });

  const groups = new Map<string, typeof enriched>();
  for (const v of enriched) {
    const key = `${v.sizeMl}::${v.provenance}`;
    const arr = groups.get(key);
    if (arr) arr.push(v);
    else groups.set(key, [v]);
  }

  const options: SizePickerOption[] = [];
  for (const members of groups.values()) {
    const byPrice = [...members].sort((a, b) => a.originalCentavos - b.originalCentavos);
    const defaultMember =
      byPrice.find((m) => !m.soldOut && m.fulfillment === "ON_HAND") ?? byPrice.find((m) => !m.soldOut) ?? byPrice[0];
    const distinctConditions = new Set(members.map((m) => m.condition));
    const distinctPackaging = new Set(members.map((m) => m.packaging));
    const subOptions: VariantSubOption[] | undefined =
      members.length > 1
        ? members
            .map((m) => {
              const parts: string[] = [];
              if (distinctConditions.size > 1) parts.push(labelForCondition(m.condition));
              if (distinctPackaging.size > 1) parts.push(labelForPackaging(m.packaging));
              return {
                skuId: m.skuId,
                condition: m.condition,
                packaging: m.packaging,
                label: parts.length > 0 ? parts.join(" · ") : labelForCondition(m.condition),
                fulfillment: m.fulfillment,
                soldOut: m.soldOut,
                originalCentavos: m.originalCentavos,
                discountedCentavos: m.discountedCentavos,
                savedCentavos: m.savedCentavos,
              };
            })
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }))
        : undefined;
    options.push({
      sizeMl: defaultMember.sizeMl!,
      label: sizePickerGroupLabel(defaultMember.sizeMl!, defaultMember.provenance),
      skuId: defaultMember.skuId,
      fulfillment: defaultMember.fulfillment,
      condition: defaultMember.condition,
      packaging: defaultMember.packaging,
      provenance: defaultMember.provenance,
      soldOut: defaultMember.soldOut,
      originalCentavos: defaultMember.originalCentavos,
      discountedCentavos: defaultMember.discountedCentavos,
      savedCentavos: defaultMember.savedCentavos,
      subOptions,
    });
  }
  return options.sort(compareSkuOrder);
}

export async function loadCatalogCards(filter: CatalogFilter = {}): Promise<CatalogCardModel[]> {
  const client = db();
  const conditions: SQL[] = [eq(products.isActive, true)];
  if (filter.types && filter.types.length > 0) {
    conditions.push(inArray(products.type, filter.types));
  } else if (filter.type) {
    conditions.push(eq(products.type, filter.type));
  }
  if (filter.fragranceCategory) {
    conditions.push(eq(products.fragranceCategory, filter.fragranceCategory));
  }
  if (filter.concentration) {
    conditions.push(eq(products.concentration, filter.concentration));
  }
  if (filter.brand) conditions.push(eq(products.brand, filter.brand));
  if (filter.gender) conditions.push(ilike(products.gender, filter.gender));
  if (filter.query && filter.query.trim().length > 0) {
    const term = `%${filter.query.trim()}%`;
    const search = or(
      ilike(products.name, term),
      ilike(products.brand, term),
      ilike(products.family, term),
    );
    if (search) conditions.push(search);
  }

  const productRows = await client
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      family: products.family,
      description: products.description,
      type: products.type,
      fragranceCategory: products.fragranceCategory,
      concentration: products.concentration,
      gender: products.gender,
      ratingValue: products.ratingValue,
      remainingMl: products.remainingMl,
      notes: products.notes,
      notePyramid: products.notePyramid,
    })
    .from(products)
    .where(and(...conditions))
    .orderBy(desc(products.createdAt));
  if (productRows.length === 0) return [];

  const productIds = productRows.map((p) => p.id);
  const [skuRows, imageRows, discountRows, promoRow] = await Promise.all([
    client
      .select({
        productId: skus.productId,
        skuId: skus.id,
        retailPrice: skus.retailPrice,
        fulfillment: skus.fulfillment,
        stock: skus.stock,
        condition: skus.condition,
        provenance: skus.provenance,
        packaging: skus.packaging,
        sizeMl: skus.sizeMl,
        isActive: skus.isActive,
        isTester: skus.isTester,
      })
      .from(skus)
      .where(and(eq(skus.isActive, true), inArray(skus.productId, productIds))),
    client
      .select({
        productId: productImages.productId,
        url: productImages.url,
        alt: productImages.alt,
        position: productImages.position,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds)),
    client.select().from(productDiscounts).where(inArray(productDiscounts.productId, productIds)),
    client.select().from(promoSettings).where(eq(promoSettings.id, "singleton")),
  ]);

  const threshold =
    promoRow[0]?.decantPreOrderThresholdMl ?? DEFAULT_DECANT_PREORDER_THRESHOLD_ML;
  const siteWideDiscount: SiteWideDiscountConfig = {
    enabled: promoRow[0]?.siteWideDiscountEnabled ?? false,
    type: promoRow[0]?.siteWideDiscountType ?? "PERCENTAGE",
    amount: promoRow[0]?.siteWideDiscountAmount ?? 0,
  };
  const skusByProduct = groupBy(skuRows, (row) => row.productId);
  const imageByProduct = new Map<string, { url: string; alt: string | null }>();
  for (const img of imageRows.sort((a, b) => a.position - b.position)) {
    if (!imageByProduct.has(img.productId)) {
      imageByProduct.set(img.productId, { url: img.url, alt: img.alt });
    }
  }
  const discountsByProduct = groupBy(discountRows, (row) => row.productId);

  const cards: CatalogCardModel[] = [];
  for (const product of productRows) {
    const variants = (skusByProduct.get(product.id) ?? []).filter((variant) => {
      if (filter.sizeMl && product.type === "DECANT") return variant.sizeMl === filter.sizeMl;
      return true;
    });
    if (variants.length === 0) continue;
    const discounts = withSiteWideDiscount(
      discountsByProduct.get(product.id) ?? [],
      product.id,
      siteWideDiscount,
    );
    const remainingMl = product.remainingMl ?? 0;
    const destination = pickDestinationSku(product.type, variants, filter.sizeMl);
    if (!destination) continue;
    const priced = variants.map((variant) => priceVariant(variant, discounts));
    const range = priced.filter((p) => p.original > 0);
    const rangeSource = range.length > 0 ? range : priced;
    const minOriginal = Math.min(...rangeSource.map((p) => p.original));
    const maxOriginal = Math.max(...rangeSource.map((p) => p.original));
    const minDiscounted = Math.min(...rangeSource.map((p) => p.discounted));
    const maxDiscounted = Math.max(...rangeSource.map((p) => p.discounted));
    const hasDiscount = priced.some((p) => p.discounted < p.original);
    const destFulfillment =
      product.type === "DECANT"
        ? decantVariantFulfillment(destination, remainingMl, threshold)
        : destination.fulfillment;
    // A RETAIL decant is a distinct physical unit with its own stock, like a
    // full bottle — it can genuinely sell out. An IN_HOUSE decant can't:
    // running low just tips it into PRE_ORDER via the shared ml pool.
    const soldOut =
      (product.type !== "DECANT" || destination.provenance === "RETAIL") &&
      destFulfillment === "ON_HAND" &&
      destination.stock <= 0;
    const savePercent =
      hasDiscount && minOriginal > 0
        ? Math.round(((minOriginal - minDiscounted) / minOriginal) * 100)
        : null;
    const image = imageByProduct.get(product.id);
    // Always populated — even a single-SKU product gets one group, so its
    // size+provenance stays visible via this instead of a separate badge.
    const sizeOptions = buildVariantOptions(variants, discounts, {
      isDecant: product.type === "DECANT",
      remainingMl,
      thresholdMl: threshold,
    });
    cards.push({
      productId: product.id,
      skuId: destination.skuId,
      name: product.name,
      brand: product.brand,
      family: product.family,
      description: product.description,
      type: product.type,
      fragranceCategory: product.fragranceCategory,
      concentration: product.concentration,
      gender: product.gender,
      ratingValue: product.ratingValue !== null ? Number(product.ratingValue) : null,
      href: `/shop/${destination.skuId}`,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt ?? product.name,
      notePyramid: normaliseNotePyramid(product.notePyramid, product.notes),
      fulfillment: destFulfillment,
      soldOut,
      minOriginalCentavos: minOriginal,
      maxOriginalCentavos: maxOriginal,
      minDiscountedCentavos: minDiscounted,
      maxDiscountedCentavos: maxDiscounted,
      hasDiscount,
      savePercent,
      sizeOptions,
    });
  }
  const sorted = sortCards(cards, filter.sort ?? "newest");
  if (!filter.limit) return sorted;
  const start = filter.offset ?? 0;
  return sorted.slice(start, start + filter.limit);
}

/**
 * Total matching cards for `filter`, ignoring `limit`/`offset` — for
 * pagination. Mirrors loadCatalogCards's product/SKU matching (including the
 * per-product "at least one active SKU" requirement) without its
 * image, discount, and pricing queries/computation, which a count doesn't need.
 */
export async function countCatalogCards(filter: Omit<CatalogFilter, "limit" | "offset"> = {}): Promise<number> {
  const client = db();
  const conditions: SQL[] = [eq(products.isActive, true)];
  if (filter.types && filter.types.length > 0) {
    conditions.push(inArray(products.type, filter.types));
  } else if (filter.type) {
    conditions.push(eq(products.type, filter.type));
  }
  if (filter.fragranceCategory) {
    conditions.push(eq(products.fragranceCategory, filter.fragranceCategory));
  }
  if (filter.concentration) {
    conditions.push(eq(products.concentration, filter.concentration));
  }
  if (filter.brand) conditions.push(eq(products.brand, filter.brand));
  if (filter.gender) conditions.push(ilike(products.gender, filter.gender));
  if (filter.query && filter.query.trim().length > 0) {
    const term = `%${filter.query.trim()}%`;
    const search = or(
      ilike(products.name, term),
      ilike(products.brand, term),
      ilike(products.family, term),
    );
    if (search) conditions.push(search);
  }

  const productRows = await client
    .select({ id: products.id, type: products.type })
    .from(products)
    .where(and(...conditions));
  if (productRows.length === 0) return 0;

  const productIds = productRows.map((p) => p.id);
  const skuRows = await client
    .select({ productId: skus.productId, sizeMl: skus.sizeMl })
    .from(skus)
    .where(and(eq(skus.isActive, true), inArray(skus.productId, productIds)));
  const skusByProduct = groupBy(skuRows, (row) => row.productId);

  let count = 0;
  for (const product of productRows) {
    const variants = skusByProduct.get(product.id) ?? [];
    const matching =
      filter.sizeMl && product.type === "DECANT" ? variants.filter((v) => v.sizeMl === filter.sizeMl) : variants;
    if (matching.length > 0) count += 1;
  }
  return count;
}

function sortCards(cards: CatalogCardModel[], sort: CatalogSort): CatalogCardModel[] {
  const sorted = [...cards];
  switch (sort) {
    case "price_asc":
      sorted.sort((a, b) => a.minDiscountedCentavos - b.minDiscountedCentavos);
      return sorted;
    case "price_desc":
      sorted.sort((a, b) => b.minDiscountedCentavos - a.minDiscountedCentavos);
      return sorted;
    case "rating":
      sorted.sort((a, b) => (b.ratingValue ?? -1) - (a.ratingValue ?? -1));
      return sorted;
    case "discount_desc":
      sorted.sort((a, b) => (b.savePercent ?? -1) - (a.savePercent ?? -1));
      return sorted;
    case "name_asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
      return sorted;
    case "name_desc":
      sorted.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" }));
      return sorted;
    case "newest":
      return sorted;
    default: {
      const exhaustive: never = sort;
      return exhaustive;
    }
  }
}

function pickDestinationSku(
  type: ProductType,
  variants: SkuRow[],
  preferredSizeMl?: number,
): SkuRow | undefined {
  const pool = pricedForDisplay(variants);
  if (type === "DECANT") {
    if (preferredSizeMl) {
      const match = pool.find((v) => v.sizeMl === preferredSizeMl);
      if (match) return match;
    }
    const three = pool.find((v) => v.sizeMl === 3);
    if (three) return three;
    return [...pool].sort((a, b) => (a.sizeMl ?? 0) - (b.sizeMl ?? 0))[0];
  }
  const onHand = pool
    .filter((v) => v.fulfillment === "ON_HAND" && v.stock > 0)
    .sort((a, b) => a.retailPrice - b.retailPrice);
  return onHand[0] ?? [...pool].sort((a, b) => a.retailPrice - b.retailPrice)[0];
}

function priceVariant(variant: SkuRow, discounts: ProductDiscount[]) {
  const { discountedUnitCentavos } = applyDiscount(
    variant.retailPrice,
    bestDiscount(discounts, variant.retailPrice),
  );
  return {
    skuId: variant.skuId,
    original: variant.retailPrice,
    discounted: discountedUnitCentavos,
  };
}

export interface SearchResultCard {
  productId: string;
  name: string;
  brand: string;
  type: ProductType;
  href: string;
  minDiscountedCentavos: number;
  maxDiscountedCentavos: number;
}

const SEARCH_RESULT_LIMIT = 20;
// Raw SQL rows to fetch before the active-SKU filter below runs. Higher than
// SEARCH_RESULT_LIMIT so products with no active SKUs (which get filtered
// out after this query) don't crowd genuinely available matches out of the
// final, capped result list.
const SEARCH_QUERY_LIMIT = 100;

/**
 * Lightweight search for the header search-as-you-type dropdown. Deliberately
 * NOT `loadCatalogCards({ query })`: that pipeline computes full pricing,
 * fulfillment, note pyramids, images, and (for decants) every size option for
 * every matching product — none of which the dropdown renders — and had no
 * result limit, so a broad query (e.g. a single letter) priced the entire
 * matching catalog. This fetches only what's displayed and caps at
 * `SEARCH_RESULT_LIMIT`.
 */
export async function searchCatalogCards(query: string): Promise<SearchResultCard[]> {
  const term = query.trim();
  if (term.length === 0) return [];
  const client = db();
  const needle = `%${term}%`;
  const matches = await client
    .select({ id: products.id, name: products.name, brand: products.brand, type: products.type })
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        or(ilike(products.name, needle), ilike(products.brand, needle), ilike(products.family, needle)),
      ),
    )
    .orderBy(desc(products.createdAt))
    .limit(SEARCH_QUERY_LIMIT);
  if (matches.length === 0) return [];

  const productIds = matches.map((m) => m.id);
  const [skuRows, discountRows, promoRow] = await Promise.all([
    client
      .select({ id: skus.id, productId: skus.productId, retailPrice: skus.retailPrice })
      .from(skus)
      .where(and(eq(skus.isActive, true), inArray(skus.productId, productIds))),
    client.select().from(productDiscounts).where(inArray(productDiscounts.productId, productIds)),
    client.select().from(promoSettings).where(eq(promoSettings.id, "singleton")),
  ]);
  const siteWideDiscount: SiteWideDiscountConfig = {
    enabled: promoRow[0]?.siteWideDiscountEnabled ?? false,
    type: promoRow[0]?.siteWideDiscountType ?? "PERCENTAGE",
    amount: promoRow[0]?.siteWideDiscountAmount ?? 0,
  };
  const skusByProduct = groupBy(skuRows, (row) => row.productId);
  const discountsByProduct = groupBy(discountRows, (row) => row.productId);

  const results: SearchResultCard[] = [];
  for (const product of matches) {
    if (results.length >= SEARCH_RESULT_LIMIT) break;
    const variants = pricedForDisplay(skusByProduct.get(product.id) ?? []);
    if (variants.length === 0) continue;
    const discounts = withSiteWideDiscount(discountsByProduct.get(product.id) ?? [], product.id, siteWideDiscount);
    const discounted = variants.map((v) => applyDiscount(v.retailPrice, bestDiscount(discounts, v.retailPrice)).discountedUnitCentavos);
    results.push({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      type: product.type,
      href: `/shop/${variants[0].id}`,
      minDiscountedCentavos: Math.min(...discounted),
      maxDiscountedCentavos: Math.max(...discounted),
    });
  }
  return results;
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const arr = map.get(k) ?? [];
    arr.push(row);
    map.set(k, arr);
  }
  return map;
}

