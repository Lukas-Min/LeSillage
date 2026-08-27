import { and, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import {
  productDiscounts,
  productImages,
  products,
  promoSettings,
  skus,
  type FragranceCategory,
  type Fulfillment,
  type ProductDiscount,
  type ProductType,
} from "@/db/schema";
import { applyDiscount, bestDiscount } from "@/domain/discount";
import { DECANT_SIZES_ML, decantFulfillment, DEFAULT_DECANT_PREORDER_THRESHOLD_ML } from "@/domain/decant";
import { normaliseNotePyramid, type NotePyramid } from "@/lib/note-pyramid";

export interface CatalogFilter {
  type?: ProductType;
  types?: ProductType[];
  fragranceCategory?: FragranceCategory;
  brand?: string;
  query?: string;
  sizeMl?: number;
}

export interface CatalogCardModel {
  productId: string;
  skuId: string;
  name: string;
  brand: string;
  family: string | null;
  description: string | null;
  type: ProductType;
  href: string;
  imageUrl: string | null;
  imageAlt: string | null;
  notePyramid: NotePyramid | null;
  fulfillment: Fulfillment;
  soldOut: boolean;
  conditionLabel: string;
  minOriginalCentavos: number;
  maxOriginalCentavos: number;
  minDiscountedCentavos: number;
  maxDiscountedCentavos: number;
  hasDiscount: boolean;
  savePercent: number | null;
}

interface SkuRow {
  productId: string;
  skuId: string;
  retailPrice: number;
  fulfillment: Fulfillment;
  stock: number;
  condition: (typeof skus.$inferSelect)["condition"];
  sizeMl: number | null;
  isActive: boolean;
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
  if (filter.brand) conditions.push(eq(products.brand, filter.brand));
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
        sizeMl: skus.sizeMl,
        isActive: skus.isActive,
      })
      .from(skus)
      .where(and(eq(skus.isActive, true), eq(skus.isTester, false), inArray(skus.productId, productIds))),
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
    const discounts = discountsByProduct.get(product.id) ?? [];
    const remainingMl = product.remainingMl ?? 0;
    const destination = pickDestinationSku(product.type, variants, filter.sizeMl);
    if (!destination) continue;
    const priced = variants.map((variant) => priceVariant(variant, discounts));
    const minOriginal = Math.min(...priced.map((p) => p.original));
    const maxOriginal = Math.max(...priced.map((p) => p.original));
    const minDiscounted = Math.min(...priced.map((p) => p.discounted));
    const maxDiscounted = Math.max(...priced.map((p) => p.discounted));
    const hasDiscount = priced.some((p) => p.discounted < p.original);
    const destFulfillment =
      product.type === "DECANT"
        ? decantFulfillment({
            remainingMl,
            sizeMl: destination.sizeMl ?? DECANT_SIZES_ML[0],
            thresholdMl: threshold,
          })
        : destination.fulfillment;
    const soldOut =
      product.type !== "DECANT" && destFulfillment === "ON_HAND" && destination.stock <= 0;
    const savePercent =
      hasDiscount && minOriginal > 0
        ? Math.round(((minOriginal - minDiscounted) / minOriginal) * 100)
        : null;
    const image = imageByProduct.get(product.id);
    cards.push({
      productId: product.id,
      skuId: destination.skuId,
      name: product.name,
      brand: product.brand,
      family: product.family,
      description: product.description,
      type: product.type,
      href: `/shop/${destination.skuId}`,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt ?? product.name,
      notePyramid: normaliseNotePyramid(product.notePyramid, product.notes),
      fulfillment: destFulfillment,
      soldOut,
      conditionLabel: labelForCondition(destination.condition),
      minOriginalCentavos: minOriginal,
      maxOriginalCentavos: maxOriginal,
      minDiscountedCentavos: minDiscounted,
      maxDiscountedCentavos: maxDiscounted,
      hasDiscount,
      savePercent,
    });
  }
  return cards;
}

function pickDestinationSku(
  type: ProductType,
  variants: SkuRow[],
  preferredSizeMl?: number,
): SkuRow | undefined {
  if (type === "DECANT") {
    if (preferredSizeMl) {
      const match = variants.find((v) => v.sizeMl === preferredSizeMl);
      if (match) return match;
    }
    const three = variants.find((v) => v.sizeMl === 3);
    if (three) return three;
    return [...variants].sort((a, b) => (a.sizeMl ?? 0) - (b.sizeMl ?? 0))[0];
  }
  const onHand = variants
    .filter((v) => v.fulfillment === "ON_HAND" && v.stock > 0)
    .sort((a, b) => a.retailPrice - b.retailPrice);
  return onHand[0] ?? variants.sort((a, b) => a.retailPrice - b.retailPrice)[0];
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

export function labelForCondition(c: (typeof skus.$inferSelect)["condition"]): string {
  switch (c) {
    case "BNIB":
      return "Sealed";
    case "SEALED":
      return "Sealed";
    case "FEW_SPRAYS_MISSING":
      return "A few sprays missing";
    case "PARTIAL_ML":
      return "Partial (ml)";
    default: {
      const exhaustive: never = c;
      return String(exhaustive);
    }
  }
}
