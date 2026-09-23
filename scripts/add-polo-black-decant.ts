/**
 * One-off add of "Ralph Lauren — Polo Black" (Eau de Toilette) as a DECANT
 * product. Metadata mirrors the full-bottle row already in the catalog
 * (added by add-full-bottles-batch-2.ts), sourced from:
 * https://www.fragrantica.com/perfume/Ralph-Lauren/Polo-Black-1197.html
 * Fragrantica lists Polo Black's notes flat (no top/middle/base tiers), so
 * notePyramid stays null and `notes` is the flat comma list, same as the
 * full-bottle row.
 *
 * Pricing follows the standard product-level formula (see src/domain/pricing.ts):
 * costPrice = ₱2,400 paid for the 125ml source bottle. pricingMode = PERCENTAGE,
 * pricingInput = 30 (30% markup) — reference retail = ₱3,120. Every decant SKU
 * (3/5/10/30ml) derives its retail price AND cost price from that reference,
 * scaled by sourceMl -> sizeMl (scaleBySize/computeSkuRetailPrice), then
 * rounded up to the nearest ₱5. remainingMl starts at the full 125ml on first
 * insert and is never overwritten on re-run (it tracks live stock).
 *
 * Usage: npx tsx scripts/add-polo-black-decant.ts
 * Safe to re-run: upserts by (brand, name, type DECANT) and by (productId, sizeMl).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { computeRetailPrice, computeSkuRetailPrice, scaleBySize } from "@/domain/pricing";
import { db } from "../src/db/client";
import { products, skus, productImages } from "../src/db/schema";
import { DECANT_SIZES_ML } from "@/domain/decant";
import { formatFragranceDescription } from "@/domain/product-type";

const BRAND = "Ralph Lauren";
const NAME = "Polo Black";
const SOURCE_ML = 125;
const REMAINING_ML = SOURCE_ML; // whole source bottle on hand at first insert
const COST_PRICE_PHP = 2400;
const MARKUP_PERCENT = 30;
const IMAGE_URL = "https://fimgs.net/mdimg/perfume-thumbs/375x500.1197.jpg";
const FRAGRANTICA_URL = "https://www.fragrantica.com/perfume/Ralph-Lauren/Polo-Black-1197.html";
const PERFUMERS = ["Pierre Negrin"];
const RELEASE_YEAR = 2005;
const FLAT_NOTES = ["Mango", "Sandalwood", "Tangerine", "Patchouli", "Tonka Bean", "Sage", "Wormwood", "Lemon"];
const ACCORDS = [
  "tropical",
  "fruity",
  "woody",
  "sweet",
  "citrus",
  "aromatic",
  "warm spicy",
  "patchouli",
  "terpenic",
  "powdery",
];

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
    concentration: "EAU_DE_TOILETTE" as const,
    name: NAME,
    brand: BRAND,
    gender: "men",
    releaseYear: RELEASE_YEAR,
    perfumers: PERFUMERS,
    notePyramid: null,
    notes: FLAT_NOTES.join(", "),
    accords: ACCORDS.map((name) => ({ name })),
    description: formatFragranceDescription({ brand: BRAND, perfumers: PERFUMERS, releaseYear: RELEASE_YEAR }),
    ratingValue: "4.01",
    ratingCount: 3972,
    fragranticaUrl: FRAGRANTICA_URL,
    sourceMl: SOURCE_ML,
    costPrice,
    pricingMode: "PERCENTAGE" as const,
    pricingInput: MARKUP_PERCENT,
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
    // remainingMl deliberately NOT overwritten on re-run — see import-decant-pricelist.ts.
    await client.update(products).set({ ...productValues, updatedAt: new Date() }).where(eq(products.id, productId));
  } else {
    const [inserted] = await client
      .insert(products)
      .values({ ...productValues, remainingMl: REMAINING_ML })
      .returning({ id: products.id });
    productId = inserted.id;
  }

  const referenceRetailPriceCentavos = computeRetailPrice({
    costPriceCentavos: costPrice,
    mode: "PERCENTAGE",
    input: MARKUP_PERCENT,
  });

  const brandSlug = slug(BRAND);
  const nameSlug = slug(NAME);

  for (const sizeMl of DECANT_SIZES_ML) {
    const retailPrice = computeSkuRetailPrice({ referenceRetailPriceCentavos, sourceMl: SOURCE_ML, sizeMl });
    const costForSize = scaleBySize({ referenceCentavos: costPrice, sourceMl: SOURCE_ML, sizeMl });
    const skuCode = `${brandSlug}-${nameSlug}-${sizeMl}ML`;
    const [existingSku] = await client
      .select({ id: skus.id })
      .from(skus)
      .where(and(eq(skus.productId, productId), eq(skus.sizeMl, sizeMl)))
      .limit(1);
    if (existingSku) {
      await client
        .update(skus)
        .set({
          sku: skuCode,
          label: `${sizeMl}ml Decant`,
          retailPrice,
          costPrice: costForSize,
          pricingInput: retailPrice,
          updatedAt: new Date(),
        })
        .where(eq(skus.id, existingSku.id));
    } else {
      await client.insert(skus).values({
        productId,
        sku: skuCode,
        label: `${sizeMl}ml Decant`,
        sizeMl,
        condition: "BNIB",
        provenance: "IN_HOUSE",
        packaging: "BOTTLE_ONLY",
        costPrice: costForSize,
        pricingMode: "DIRECT",
        pricingInput: retailPrice,
        retailPrice,
        fulfillment: "ON_HAND",
        stock: 0, // decant stock is tracked via the product's shared remainingMl pool
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
  const imageValues = {
    url: IMAGE_URL,
    alt: `${BRAND} — ${NAME} Eau de Toilette`,
  };
  if (existingImage) {
    await client.update(productImages).set(imageValues).where(eq(productImages.id, existingImage.id));
  } else {
    await client.insert(productImages).values({
      productId,
      ...imageValues,
      position: 0,
    });
  }

  console.log(`✓ ${BRAND} — ${NAME} EDT DECANT (productId ${productId})`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
