/**
 * Upserts decant products and their 3/5/10/30ml SKUs from
 * `scripts/data/decant-pricelist.json`. SKU retail prices are the file's own
 * numbers, not the product markup formula. A re-run does not reset remainingMl.
 *
 *   npx tsx scripts/import-decant-pricelist.ts
 */
import { readFileSync } from "fs";
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/db/client";
import { products, skus, type Concentration, type FragranceCategory } from "@/db/schema";

interface DecantEntry {
  brand: string;
  name: string;
  concentration: Concentration;
  category: FragranceCategory;
  gender: "men" | "women" | "unisex";
  prices: { 3: number; 5: number; 10: number; 30: number };
  fullBottle?: { sizeMl: number; basePricePhp: number };
}

function loadCatalog(): DecantEntry[] {
  return JSON.parse(readFileSync(new URL("./data/decant-pricelist.json", import.meta.url), "utf8")) as DecantEntry[];
}

function slug(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function php(pesos: number) {
  return Math.round(pesos * 100);
}

export async function runDecantPricelist(): Promise<void> {
  const catalog = loadCatalog();
  const client = db();
  let skuCount = 0;

  for (const entry of catalog) {
    const sourceMl = entry.fullBottle?.sizeMl ?? null;
    const referenceCostPrice = entry.fullBottle ? php(entry.fullBottle.basePricePhp) : 0;
    const productValues = {
      type: "DECANT" as const,
      fragranceCategory: entry.category,
      concentration: entry.concentration,
      name: entry.name,
      brand: entry.brand,
      gender: entry.gender,
      sourceMl,
      costPrice: referenceCostPrice,
      pricingMode: "DIRECT" as const,
      pricingInput: referenceCostPrice,
    };

    const [existing] = await client
      .select({ id: products.id })
      .from(products)
      .where(and(ilike(products.brand, entry.brand), ilike(products.name, entry.name), eq(products.type, "DECANT")))
      .limit(1);

    let productId: string;
    if (existing) {
      productId = existing.id;
      await client.update(products).set({ ...productValues, updatedAt: new Date() }).where(eq(products.id, productId));
    } else {
      const [inserted] = await client
        .insert(products)
        .values({ ...productValues, remainingMl: sourceMl })
        .returning({ id: products.id });
      productId = inserted.id;
    }

    for (const sizeMl of [3, 5, 10, 30] as const) {
      const retailPrice = php(entry.prices[sizeMl]);
      const costForSize = entry.fullBottle ? Math.round((referenceCostPrice / entry.fullBottle.sizeMl) * sizeMl) : 0;
      const [existingSku] = await client
        .select({ id: skus.id })
        .from(skus)
        .where(and(eq(skus.productId, productId), eq(skus.sizeMl, sizeMl)))
        .limit(1);
      if (existingSku) {
        await client
          .update(skus)
          .set({ retailPrice, pricingInput: retailPrice, costPrice: costForSize, updatedAt: new Date() })
          .where(eq(skus.id, existingSku.id));
      } else {
        await client.insert(skus).values({
          productId,
          sku: `${slug(entry.brand)}-${slug(entry.name)}-${sizeMl}ML`,
          label: `${sizeMl}ml Decant`,
          sizeMl,
          condition: "BNIB",
          provenance: "RETAIL",
          packaging: "BOTTLE_ONLY",
          costPrice: costForSize,
          pricingMode: "DIRECT",
          pricingInput: retailPrice,
          retailPrice,
          fulfillment: "ON_HAND",
          stock: 0,
          isTester: false,
        });
      }
      skuCount += 1;
    }
    console.log(`✓ decant ${entry.brand} — ${entry.name}`);
  }

  console.log(`Decant pricelist: ${catalog.length} products, ${skuCount} SKUs.`);
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/import-decant-pricelist.ts");
if (invokedDirectly) {
  runDecantPricelist()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
