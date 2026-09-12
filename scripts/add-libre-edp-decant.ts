/**
 * One-off add of "Yves Saint Laurent — Libre" (Eau de Parfum) as a DECANT
 * product, sourced from its Fragrantica page:
 * https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Libre-56077.html
 *
 * Distinct from the existing Libre Eau de Toilette DECANT and from the
 * Libre full-bottle listing. Name stays "Libre" (concentration lives on
 * the product row), matching the full-bottle catalog.
 *
 * Pricing follows the standard product-level formula (see src/domain/pricing.ts):
 * costPrice = ₱5,500 paid for the 90ml source bottle. pricingMode = PERCENTAGE,
 * pricingInput = 30 (30% markup) — reference retail = ₱7,150.
 * Every decant SKU (3/5/10/30ml) derives its retail price AND cost price from
 * that reference, scaled by sourceMl -> sizeMl (scaleBySize/computeSkuRetailPrice).
 * sourceMl stays 90 (bottle capacity, for the cost formula). remainingMl starts
 * at 0 — the source bottle is not on hand yet, so IN_HOUSE SKUs display as
 * pre-order via decantFulfillment() (SKU fulfillment/stock are inert).
 *
 * Usage: npx tsx scripts/add-libre-edp-decant.ts
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

const BRAND = "Yves Saint Laurent";
const NAME = "Libre";
const SOURCE_ML = 90;
const REMAINING_ML = 0; // bottle not on hand yet; IN_HOUSE display uses remainingMl
const COST_PRICE_PHP = 5500;
const MARKUP_PERCENT = 30;
const IMAGE_URL = "https://fimgs.net/mdimg/perfume-thumbs/375x500.56077.jpg";
const FRAGRANTICA_URL = "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Libre-56077.html";
const PERFUMERS = ["Anne Flipo", "Carlos Benaïm"];
const RELEASE_YEAR = 2019;
const NOTE_PYRAMID = {
  top: ["Lavender", "Mandarin Orange", "Black Currant", "Petitgrain"],
  middle: ["Lavender", "Orange Blossom", "Jasmine"],
  base: ["Madagascar Vanilla", "Musk", "Cedar", "Ambergris"],
};

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
    releaseYear: RELEASE_YEAR,
    perfumers: PERFUMERS,
    notePyramid: NOTE_PYRAMID,
    notes: [
      `Top: ${NOTE_PYRAMID.top.join(", ")}`,
      `Middle: ${NOTE_PYRAMID.middle.join(", ")}`,
      `Base: ${NOTE_PYRAMID.base.join(", ")}`,
    ].join(" | "),
    accords: [
      { name: "white floral", strength: 100 },
      { name: "citrus", strength: 73 },
      { name: "lavender", strength: 65 },
      { name: "vanilla", strength: 49 },
      { name: "aromatic", strength: 39 },
      { name: "sweet", strength: 36 },
      { name: "powdery", strength: 33 },
      { name: "animalic", strength: 32 },
    ],
    description: formatFragranceDescription({ brand: BRAND, perfumers: PERFUMERS, releaseYear: RELEASE_YEAR }),
    ratingValue: "3.92",
    ratingCount: 22371,
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
  const imageValues = {
    url: IMAGE_URL,
    alt: `${BRAND} — ${NAME} Eau de Parfum`,
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

  console.log(`✓ ${BRAND} — ${NAME} EDP (productId ${productId})`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
