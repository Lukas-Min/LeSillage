/**
 * One-off add of "Yves Saint Laurent — Libre Le Parfum" (2022 Parfum-tier
 * flanker) as a DECANT product, sourced from its Fragrantica page:
 * https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Libre-Le-Parfum-75676.html
 *
 * Priced identically to the existing "Libre Flowers & Flames" DECANT, per
 * the store owner's request — not an independently-sourced wholesale cost.
 * costPrice/sourceMl/markup below are copied from that product's live values
 * (₱5,750 for a 90ml source bottle, PERCENTAGE/30%); since every decant
 * shares that same 30% markup post-normalize-decant-markup.ts, matching
 * costPrice + sourceMl is sufficient to make every SKU price identical too.
 *
 * Usage: npx tsx scripts/add-libre-le-parfum-decant.ts
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
const NAME = "Libre Le Parfum";
const SOURCE_ML = 90; // matches Libre Flowers & Flames, for identical per-ml pricing
const REMAINING_ML = 0; // bottle not on hand yet; IN_HOUSE display uses remainingMl
const COST_PRICE_PHP = 5750; // matches Libre Flowers & Flames' current cost, not an independent quote
const MARKUP_PERCENT = 30;
const IMAGE_URL = "https://fimgs.net/mdimg/perfume-thumbs/375x500.75676.jpg";
const FRAGRANTICA_URL = "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Libre-Le-Parfum-75676.html";
const PERFUMERS = ["Anne Flipo", "Carlos Benaïm"];
const RELEASE_YEAR = 2022;
const NOTE_PYRAMID = {
  top: ["Ginger", "Saffron", "Mandarin Orange", "Bergamot"],
  middle: ["Orange Blossom", "Lavender"],
  base: ["Bourbon Vanilla", "Honey", "Tonka Bean", "Vetiver"],
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
    // YSL's own "Le Parfum" line name (also Y Le Parfum, La Nuit de
    // L'Homme Le Parfum) denotes a Parfum-strength reformulation, distinct
    // from an "Eau de Parfum" — unlike "Libre Intense", which Fragrantica
    // and YSL both still call an EDP flanker.
    concentration: "PARFUM" as const,
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
      { name: "vanilla", strength: 100 },
      { name: "sweet", strength: 91 },
      { name: "citrus", strength: 87 },
      { name: "honey", strength: 76 },
      { name: "white floral", strength: 69 },
      { name: "lavender", strength: 69 },
      { name: "fresh spicy", strength: 68 },
      { name: "aromatic", strength: 66 },
      { name: "warm spicy", strength: 56 },
      { name: "floral", strength: 50 },
    ],
    description: formatFragranceDescription({ brand: BRAND, perfumers: PERFUMERS, releaseYear: RELEASE_YEAR }),
    ratingValue: "4.28",
    ratingCount: 5102,
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
    alt: `${BRAND} — ${NAME}`,
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

  console.log(`✓ ${BRAND} — ${NAME} (productId ${productId})`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
