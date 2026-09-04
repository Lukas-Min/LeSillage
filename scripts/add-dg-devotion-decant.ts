/**
 * One-off add of "Dolce & Gabbana — Devotion" as a DECANT product, sourced
 * from its Fragrantica page:
 * https://www.fragrantica.com/perfume/Dolce-Gabbana/Devotion-84951.html
 *
 * Pricing follows the standard product-level formula (see src/domain/pricing.ts):
 * costPrice = discounted price paid for the 50ml source bottle (₱2,250).
 * pricingMode = FIXED, pricingInput = a flat ₱3,000 markup on top of cost
 * (not a percentage) per the user — reference retail = ₱2,250 + ₱3,000 = ₱5,250.
 * Every decant SKU (3/5/10/30ml) derives its retail price AND cost price from
 * that reference, scaled by sourceMl -> sizeMl (scaleBySize/computeSkuRetailPrice).
 *
 * Usage: npx tsx scripts/add-dg-devotion-decant.ts
 * Safe to re-run: upserts by (brand, name, type DECANT) and by (productId, sizeMl).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { computeRetailPrice, computeSkuRetailPrice, scaleBySize } from "@/domain/pricing";
import { db } from "../src/db/client";
import { products, skus, productImages } from "../src/db/schema";
import { DECANT_SIZES_ML } from "../src/domain/decant";
import { formatFragranceDescription } from "@/domain/product-type";

const BRAND = "Dolce & Gabbana";
const NAME = "Devotion";
const SOURCE_ML = 50; // the whole bottle, per the user
const COST_PRICE_PHP = 2250; // discounted price paid for the 50ml bottle
const FIXED_MARKUP_PHP = 3000; // flat ₱ markup on top of cost, not a percentage
const IMAGE_URL = "https://fimgs.net/mdimg/perfume-thumbs/375x500.84951.jpg";
const FRAGRANTICA_URL = "https://www.fragrantica.com/perfume/Dolce-Gabbana/Devotion-84951.html";

function slug(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function php(pesos: number) {
  return Math.round(pesos * 100);
}

async function main() {
  const client = db();
  const costPrice = php(COST_PRICE_PHP);

  const productValues = {
    type: "DECANT" as const,
    fragranceCategory: "DESIGNER" as const,
    concentration: "EAU_DE_PARFUM" as const,
    name: NAME,
    brand: BRAND,
    gender: "women",
    releaseYear: 2023,
    perfumers: ["Olivier Cresp"],
    notePyramid: {
      top: ["Candied Lemon"],
      middle: ["Panacotta", "Orange Blossom", "Rum"],
      base: ["Vanilla"],
    },
    notes: "Top: Candied Lemon | Middle: Panacotta, Orange Blossom, Rum | Base: Vanilla",
    accords: ["vanilla", "sweet", "white floral", "lactonic", "powdery", "rum", "citrus"].map((name) => ({ name })),
    description: formatFragranceDescription({ brand: BRAND, perfumers: ["Olivier Cresp"], releaseYear: 2023 }),
    ratingValue: "3.97",
    ratingCount: 12418,
    reviewsCount: null,
    fragranticaUrl: FRAGRANTICA_URL,
    sourceMl: SOURCE_ML,
    costPrice,
    pricingMode: "FIXED" as const,
    pricingInput: php(FIXED_MARKUP_PHP),
    isActive: true,
  };

  const [existing] = await client
    .select({ id: products.id })
    .from(products)
    .where(and(ilike(products.brand, BRAND), ilike(products.name, NAME), eq(products.type, "DECANT")))
    .limit(1);

  let productId: string;
  if (existing) {
    productId = existing.id;
    await client.update(products).set({ ...productValues, updatedAt: new Date() }).where(eq(products.id, productId));
  } else {
    const [inserted] = await client
      .insert(products)
      .values({ ...productValues, remainingMl: SOURCE_ML })
      .returning({ id: products.id });
    productId = inserted.id;
  }

  const referenceRetailPriceCentavos = computeRetailPrice({
    costPriceCentavos: costPrice,
    mode: "FIXED",
    input: php(FIXED_MARKUP_PHP),
  });

  const brandSlug = slug(BRAND);
  const nameSlug = slug(NAME);

  for (const sizeMl of DECANT_SIZES_ML) {
    const retailPrice = computeSkuRetailPrice({ referenceRetailPriceCentavos, sourceMl: SOURCE_ML, sizeMl });
    const costForSize = scaleBySize({ referenceCentavos: costPrice, sourceMl: SOURCE_ML, sizeMl });
    const [existingSku] = await client
      .select({ id: skus.id })
      .from(skus)
      .where(and(eq(skus.productId, productId), eq(skus.sizeMl, sizeMl)))
      .limit(1);
    if (existingSku) {
      await client
        .update(skus)
        .set({ retailPrice, costPrice: costForSize, pricingInput: retailPrice, updatedAt: new Date() })
        .where(eq(skus.id, existingSku.id));
    } else {
      await client.insert(skus).values({
        productId,
        sku: `${brandSlug}-${nameSlug}-${sizeMl}ML`,
        label: `${sizeMl}ml Decant`,
        sizeMl,
        condition: "BNIB",
        provenance: "RETAIL",
        packaging: "BOTTLE_ONLY",
        costPrice: costForSize,
        pricingMode: "DIRECT",
        pricingInput: retailPrice,
        retailPrice,
        // decant stock is tracked via the product's shared remainingMl pool
        fulfillment: "ON_HAND",
        stock: 0,
        isTester: false,
      });
    }
    console.log(`  ${sizeMl}ml -> ₱${(retailPrice / 100).toFixed(2)} (cost ₱${(costForSize / 100).toFixed(2)})`);
  }

  const [existingImage] = await client
    .select({ id: productImages.id })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .limit(1);
  if (!existingImage) {
    await client.insert(productImages).values({
      productId,
      url: IMAGE_URL,
      alt: `${BRAND} — ${NAME}`,
      position: 0,
    });
  }

  console.log(`✓ ${BRAND} — ${NAME} (productId ${productId})`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
