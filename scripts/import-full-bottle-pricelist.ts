/**
 * Upserts full-bottle products from `scripts/data/full-bottle-pricelist.json`,
 * or another file passed as an argument. Cost is the file's discounted price.
 * Retail is that cost plus markupPercent, or 20% when the file omits it.
 * Does not touch a decant of the same name.
 *
 *   npx tsx scripts/import-full-bottle-pricelist.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { formatFragranceDescription, newSkuFulfillmentDefaults } from "@/domain/product-type";
import { db } from "@/db/client";
import { productImages, products, skus, type Concentration, type FragranceCategory } from "@/db/schema";
import {
  catalogSlug,
  DEFAULT_FULL_BOTTLE_MARKUP_PERCENT,
  formatNotesSummary,
  loadCatalogJson,
  pesosToCentavos,
  retailFromMarkup,
  runWhenInvoked,
} from "./catalog-script";

interface FullBottleEntry {
  brand: string;
  name: string;
  concentration: Concentration;
  category: FragranceCategory;
  gender: "men" | "women" | "unisex";
  costPricePhp: number;
  markupPercent?: number;
  sizeMl: number;
  releaseYear: number;
  perfumers: string[];
  notes: { top: string[]; middle: string[]; base: string[] };
  accords: Array<{ name: string; strength: number }>;
  ratingValue: number;
  ratingCount: number;
  imageUrl: string;
  fragranticaUrl: string;
}

function loadCatalog(): FullBottleEntry[] {
  return loadCatalogJson<FullBottleEntry[]>("full-bottle-pricelist.json");
}

export async function runFullBottlePricelist(): Promise<void> {
  const catalog = loadCatalog();
  const client = db();

  for (const entry of catalog) {
    const costPrice = pesosToCentavos(entry.costPricePhp);
    const markupPercent = entry.markupPercent ?? DEFAULT_FULL_BOTTLE_MARKUP_PERCENT;
    const productValues = {
      type: "FULL_BOTTLE" as const,
      fragranceCategory: entry.category,
      concentration: entry.concentration,
      name: entry.name,
      brand: entry.brand,
      gender: entry.gender,
      description: formatFragranceDescription(entry),
      notes: formatNotesSummary(entry.notes),
      notePyramid: entry.notes,
      accords: entry.accords,
      perfumers: entry.perfumers,
      ratingValue: entry.ratingValue.toFixed(2),
      ratingCount: entry.ratingCount,
      releaseYear: entry.releaseYear,
      fragranticaUrl: entry.fragranticaUrl,
      costPrice,
      pricingMode: "PERCENTAGE" as const,
      pricingInput: markupPercent,
    };

    const [existing] = await client
      .select({ id: products.id })
      .from(products)
      .where(and(ilike(products.brand, entry.brand), ilike(products.name, entry.name), eq(products.type, "FULL_BOTTLE")))
      .limit(1);

    let productId: string;
    if (existing) {
      productId = existing.id;
      await client.update(products).set({ ...productValues, updatedAt: new Date() }).where(eq(products.id, productId));
    } else {
      const [inserted] = await client.insert(products).values(productValues).returning({ id: products.id });
      productId = inserted.id;
    }

    const retailPrice = retailFromMarkup(costPrice, markupPercent);
    const label = `${entry.sizeMl}ml Full bottle`;
    const skuCode = `${catalogSlug(entry.brand)}-${catalogSlug(entry.name)}-${entry.sizeMl}ML`;
    const [existingSku] = await client.select({ id: skus.id }).from(skus).where(eq(skus.productId, productId)).limit(1);
    if (existingSku) {
      await client
        .update(skus)
        .set({ sku: skuCode, sizeMl: entry.sizeMl, label, retailPrice, pricingInput: retailPrice, updatedAt: new Date() })
        .where(eq(skus.id, existingSku.id));
    } else {
      await client.insert(skus).values({
        productId,
        sku: skuCode,
        label,
        sizeMl: entry.sizeMl,
        condition: "BNIB",
        provenance: "RETAIL",
        packaging: "WITH_BOX",
        costPrice: 0,
        pricingMode: "DIRECT",
        pricingInput: retailPrice,
        retailPrice,
        stock: 0,
        ...newSkuFulfillmentDefaults("FULL_BOTTLE"),
        isTester: false,
      });
    }

    const alt = `${entry.brand} — ${entry.name}`;
    const [existingImage] = await client
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .limit(1);
    if (existingImage) {
      await client.update(productImages).set({ url: entry.imageUrl, alt }).where(eq(productImages.id, existingImage.id));
    } else {
      await client.insert(productImages).values({ productId, url: entry.imageUrl, alt, position: 0 });
    }

    console.log(`✓ bottle ${entry.brand} — ${entry.name}`);
  }

  console.log(`Full-bottle pricelist: ${catalog.length} products.`);
}

runWhenInvoked("scripts/import-full-bottle-pricelist.ts", runFullBottlePricelist);
