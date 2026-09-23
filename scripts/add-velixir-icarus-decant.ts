/**
 * One-off add of "Velixir — Icarus" (Eau de Parfum) as a DECANT product.
 * No full-bottle Icarus listing exists in the catalog, so metadata comes
 * straight from Fragrantica:
 * https://www.fragrantica.com/perfume/Velixir/Icarus-127589.html
 * Fragrantica lists no perfumer and no user rating yet, so perfumers is empty
 * and ratingValue/ratingCount stay null. Icarus is a Middle Eastern-style
 * clone (a dupe), so the listing is filed under MIDDLE_EASTERN rather than NICHE.
 *
 * Pricing follows the standard product-level formula (see src/domain/pricing.ts):
 * costPrice = ₱2,550 paid for the 100ml source bottle. pricingMode = PERCENTAGE,
 * pricingInput = 30 (30% markup) — reference retail = ₱3,315. Every decant SKU
 * (3/5/10/30ml) derives its retail price AND cost price from that reference,
 * scaled by sourceMl -> sizeMl (scaleBySize/computeSkuRetailPrice), then
 * rounded up to the nearest ₱5. remainingMl starts at the full 100ml on first
 * insert and is never overwritten on re-run (it tracks live stock).
 *
 * Usage: npx tsx scripts/add-velixir-icarus-decant.ts
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

const BRAND = "Velixir";
const NAME = "Icarus";
const SOURCE_ML = 100;
const REMAINING_ML = SOURCE_ML; // whole source bottle on hand at first insert
const DECANT_COST_PRICE_PHP = 2550;
const DECANT_MARKUP_PERCENT = 30;
const IMAGE_URL = "https://fimgs.net/mdimg/perfume-thumbs/375x500.127589.jpg";
const FRAGRANTICA_URL = "https://www.fragrantica.com/perfume/Velixir/Icarus-127589.html";
const PERFUMERS: string[] = [];
const RELEASE_YEAR = 2024;
const NOTE_PYRAMID = {
  top: ["Pear", "Calabrian Bergamot", "Mandarin Orange"],
  middle: ["Mandarin Orange", "Orange Blossom", "Georgywood", "Ginger"],
  base: ["Musk", "Ambrofix", "Akigalawood", "Cedarwood"],
};
const ACCORDS = [
  "citrus",
  "woody",
  "fruity",
  "musky",
  "sweet",
  "fresh spicy",
  "white floral",
  "powdery",
  "fresh",
  "oud",
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

async function addDecant() {
  const client = db();
  const costPrice = php(DECANT_COST_PRICE_PHP);

  const productValues = {
    type: "DECANT" as const,
    fragranceCategory: "MIDDLE_EASTERN" as const,
    concentration: "EAU_DE_PARFUM" as const,
    name: NAME,
    brand: BRAND,
    gender: "unisex",
    releaseYear: RELEASE_YEAR,
    perfumers: PERFUMERS,
    notePyramid: NOTE_PYRAMID,
    notes: [
      `Top: ${NOTE_PYRAMID.top.join(", ")}`,
      `Middle: ${NOTE_PYRAMID.middle.join(", ")}`,
      `Base: ${NOTE_PYRAMID.base.join(", ")}`,
    ].join(" | "),
    accords: ACCORDS.map((name) => ({ name })),
    description: formatFragranceDescription({ brand: BRAND, perfumers: PERFUMERS, releaseYear: RELEASE_YEAR }),
    ratingValue: null,
    ratingCount: null,
    fragranticaUrl: FRAGRANTICA_URL,
    sourceMl: SOURCE_ML,
    costPrice,
    pricingMode: "PERCENTAGE" as const,
    pricingInput: DECANT_MARKUP_PERCENT,
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
    input: DECANT_MARKUP_PERCENT,
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

  console.log(`✓ ${BRAND} — ${NAME} EDP DECANT (productId ${productId})`);
}

async function main() {
  await addDecant();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
