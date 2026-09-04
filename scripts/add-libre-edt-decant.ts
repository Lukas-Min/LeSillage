/**
 * One-off add of "Yves Saint Laurent — Libre Eau de Toilette" as a DECANT
 * product, sourced from its Fragrantica page:
 * https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Libre-Eau-de-Toilette-65936.html
 *
 * Pricing follows the standard product-level formula (see src/domain/pricing.ts),
 * not the hardcoded-per-size approach in import-decant-pricelist.ts — the user
 * gave a single source-bottle cost + markup, not a full per-size pricelist.
 * costPrice = discounted price paid for the 40ml source bottle (₱3,600).
 * pricingMode = PERCENTAGE, pricingInput = 30 (30% markup) per the user.
 * Every decant SKU (3/5/10/30ml) derives its retail price from that reference,
 * scaled by sourceMl -> sizeMl, exactly like resyncSkuPricesForProduct does.
 *
 * Usage: npx tsx scripts/add-libre-edt-decant.ts
 * Safe to re-run: upserts by (brand, name, type DECANT) and by (productId, sizeMl).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, ilike } from "drizzle-orm";
import { computeRetailPrice, computeSkuRetailPrice } from "@/domain/pricing";
import { db } from "../src/db/client";
import { products, skus, productImages } from "../src/db/schema";
import { DECANT_SIZES_ML } from "../src/domain/decant";

const BRAND = "Yves Saint Laurent";
const NAME = "Libre Eau de Toilette";
const SOURCE_ML = 40; // the size of the source bottle in stock
const COST_PRICE_PHP = 3600; // discounted price paid for the source bottle
const MARKUP_PERCENT = 30;
const IMAGE_URL = "https://fimgs.net/mdimg/perfume-thumbs/375x500.65936.jpg";
const FRAGRANTICA_URL = "https://www.fragrantica.com/perfume/Yves-Saint-Laurent/Libre-Eau-de-Toilette-65936.html";

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
    gender: "women",
    releaseYear: 2021,
    perfumers: ["Anne Flipo", "Carlos Benaïm"],
    notePyramid: {
      top: ["Lavender", "Bergamot", "Mandarin Orange"],
      middle: ["Orange Blossom", "Jasmine Tea", "Jasmine"],
      base: ["Musk", "Vanilla", "Ambergris"],
    },
    notes:
      "Top: Lavender, Bergamot, Mandarin Orange | Middle: Orange Blossom, Jasmine Tea, Jasmine | Base: Musk, Vanilla, Ambergris",
    accords: [
      { name: "white floral" },
      { name: "citrus" },
      { name: "lavender" },
      { name: "floral" },
      { name: "fresh" },
      { name: "musky" },
      { name: "vanilla" },
      { name: "sweet" },
      { name: "fresh spicy" },
      { name: "powdery" },
    ],
    description:
      "Libre Eau de Toilette by Yves Saint Laurent is a Floral fragrance for women. " +
      "Libre Eau de Toilette was launched in 2021. Libre Eau de Toilette was created by " +
      "Anne Flipo and Carlos Benaïm. Top notes are Lavender, Bergamot and Mandarin Orange; " +
      "middle notes are Orange Blossom, Jasmine Tea and Jasmine; base notes are Musk, Vanilla and Ambergris.",
    ratingValue: "3.95",
    ratingCount: 3050,
    reviewsCount: 267,
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
      .values({ ...productValues, remainingMl: SOURCE_ML })
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
    const [existingSku] = await client
      .select({ id: skus.id })
      .from(skus)
      .where(and(eq(skus.productId, productId), eq(skus.sizeMl, sizeMl)))
      .limit(1);
    if (existingSku) {
      await client
        .update(skus)
        .set({ retailPrice, pricingInput: retailPrice, updatedAt: new Date() })
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
        costPrice: 0,
        pricingMode: "DIRECT",
        pricingInput: retailPrice,
        retailPrice,
        // decant stock is tracked via the product's shared remainingMl pool
        fulfillment: "ON_HAND",
        stock: 0,
        isTester: false,
      });
    }
    console.log(`  ${sizeMl}ml -> ₱${(retailPrice / 100).toFixed(2)}`);
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
