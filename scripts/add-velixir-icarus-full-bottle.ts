/**
 * One-off add of "Velixir — Icarus" (Eau de Parfum) as a FULL_BOTTLE product,
 * alongside the existing DECANT listing (add-velixir-icarus-decant.ts) — same
 * fragrance, separate product row (type is part of a product's identity), same
 * metadata reused from that script's Fragrantica sourcing:
 * https://www.fragrantica.com/perfume/Velixir/Icarus-127589.html
 *
 * Pricing is a direct final price, not a formula: cost ₱2,550, retail ₱3,000
 * as given (₱3,000 is not a markup calculation off ₱2,550 — it's ~17.6%,
 * not a round percentage — so both the product and its one SKU are stored
 * DIRECT rather than PERCENTAGE, matching how DIRECT-priced full bottles
 * elsewhere in the catalog are set up so a later admin edit can't silently
 * recompute and drift the price). Single 100ml SKU, BNIB/boxed/Retail, stock
 * 0 pending admin count — availableForPreOrder true so it shows as pre-order
 * instead of being hidden (newSkuFulfillmentDefaults).
 *
 * Usage: npx tsx scripts/add-velixir-icarus-full-bottle.ts
 * Safe to re-run: upserts by (brand, name, type FULL_BOTTLE) and by productId.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { db } from "../src/db/client";
import { products, skus, productImages } from "../src/db/schema";
import { formatFragranceDescription, newSkuFulfillmentDefaults } from "@/domain/product-type";

const BRAND = "Velixir";
const NAME = "Icarus";
const SIZE_ML = 100;
const COST_PRICE_PHP = 2550;
const RETAIL_PRICE_PHP = 3000;
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

async function main() {
  const client = db();
  const costPrice = php(COST_PRICE_PHP);
  const retailPrice = php(RETAIL_PRICE_PHP);

  const productValues = {
    type: "FULL_BOTTLE" as const,
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
    costPrice,
    pricingMode: "DIRECT" as const,
    pricingInput: retailPrice,
    isActive: true,
  };

  const [existing] = await client
    .select({ id: products.id })
    .from(products)
    .where(and(ilike(products.brand, BRAND), ilike(products.name, NAME), eq(products.type, "FULL_BOTTLE")))
    .limit(1);

  let productId: string;
  if (existing) {
    productId = existing.id;
    await client.update(products).set({ ...productValues, updatedAt: new Date() }).where(eq(products.id, productId));
  } else {
    const [inserted] = await client.insert(products).values(productValues).returning({ id: products.id });
    productId = inserted.id;
  }

  const brandSlug = slug(BRAND);
  const nameSlug = slug(NAME);

  const [existingSku] = await client.select({ id: skus.id }).from(skus).where(eq(skus.productId, productId)).limit(1);
  if (existingSku) {
    await client
      .update(skus)
      .set({
        sizeMl: SIZE_ML,
        label: `${SIZE_ML}ml Full bottle`,
        condition: "BNIB",
        provenance: "RETAIL",
        packaging: "WITH_BOX",
        costPrice,
        pricingMode: "DIRECT",
        pricingInput: retailPrice,
        retailPrice,
        updatedAt: new Date(),
      })
      .where(eq(skus.id, existingSku.id));
  } else {
    await client.insert(skus).values({
      productId,
      sku: `${brandSlug}-${nameSlug}-${SIZE_ML}`,
      label: `${SIZE_ML}ml Full bottle`,
      sizeMl: SIZE_ML,
      condition: "BNIB",
      provenance: "RETAIL",
      packaging: "WITH_BOX",
      costPrice,
      pricingMode: "DIRECT",
      pricingInput: retailPrice,
      retailPrice,
      stock: 0,
      ...newSkuFulfillmentDefaults("FULL_BOTTLE"),
      isTester: false,
    });
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

  console.log(`✓ ${BRAND} — ${NAME} EDP FULL_BOTTLE (${SIZE_ML}ml) -> ₱${RETAIL_PRICE_PHP} (cost ₱${COST_PRICE_PHP}) [productId ${productId}]`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
