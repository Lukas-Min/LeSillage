import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, isNotNull } from "drizzle-orm";
import { computeRetailPrice } from "@/domain/pricing";
import { guessConcentration } from "@/domain/concentration";
import { lookupFragella, buildFragellaQuery, type FragellaRecord } from "@/lib/fragella";
import type { PricingMode, FragranceCategory } from "../src/db/schema";
import { db } from "../src/db/client";
import {
  products,
  skus,
  productImages,
  productDiscounts,
  promoSettings,
  qrCodes,
  siteContent,
  optionLists,
  optionValues,
} from "../src/db/schema";

const MIN_FRAGRANCES = 10;

interface QueryPoolEntry {
  query: string;
  category: FragranceCategory;
}

// A pool of real, well-known fragrances to search for on every seed run.
// We only take MIN_FRAGRANCES of these (chosen at random), so the catalog
// looks different each time `db:seed` runs.
const QUERY_POOL: QueryPoolEntry[] = [
  { query: "Dior Sauvage", category: "DESIGNER" },
  { query: "Chanel Bleu de Chanel", category: "DESIGNER" },
  { query: "Yves Saint Laurent Black Opium", category: "DESIGNER" },
  { query: "Giorgio Armani Acqua di Gio", category: "DESIGNER" },
  { query: "Versace Eros", category: "DESIGNER" },
  { query: "Prada Luna Rossa", category: "DESIGNER" },
  { query: "Gucci Bloom", category: "DESIGNER" },
  { query: "Calvin Klein CK One", category: "DESIGNER" },
  { query: "Burberry Her", category: "DESIGNER" },
  { query: "Hugo Boss Bottled", category: "DESIGNER" },
  { query: "Creed Aventus", category: "NICHE" },
  { query: "Le Labo Santal 33", category: "NICHE" },
  { query: "Byredo Gypsy Water", category: "NICHE" },
  { query: "Maison Francis Kurkdjian Baccarat Rouge 540", category: "NICHE" },
  { query: "Amouage Interlude Man", category: "NICHE" },
  { query: "Parfums de Marly Layton", category: "NICHE" },
  { query: "Initio Side Effect", category: "NICHE" },
  { query: "Xerjoff Naxos", category: "NICHE" },
  { query: "Lattafa Khamrah", category: "MIDDLE_EASTERN" },
  { query: "Ajmal Amber Wood", category: "MIDDLE_EASTERN" },
  { query: "Rasasi Hawas", category: "MIDDLE_EASTERN" },
  { query: "Afnan 9pm", category: "MIDDLE_EASTERN" },
  { query: "Swiss Arabian Shaghaf Oud", category: "MIDDLE_EASTERN" },
];

interface SeedSkuInput {
  productId: string;
  sku: string;
  label: string;
  sizeMl: number;
  condition: "BNIB" | "SEALED" | "FEW_SPRAYS_MISSING" | "PARTIAL_ML";
  provenance: "RETAIL" | "TESTER";
  packaging: "WITH_BOX" | "BOTTLE_ONLY";
  costPrice: number;
  pricingMode: PricingMode;
  pricingInput: number;
  retailPrice: number;
  fulfillment: "PRE_ORDER" | "ON_HAND";
  stock: number;
  isTester: boolean;
  testerFamily?: string | null;
  testerBrand?: string | null;
}

function assertPricing(sku: SeedSkuInput) {
  const expected = computeRetailPrice({
    costPriceCentavos: sku.costPrice,
    mode: sku.pricingMode,
    input: sku.pricingInput,
  });
  if (expected !== sku.retailPrice) {
    throw new Error(
      `Seed mismatch on ${sku.sku}: stored retail ${sku.retailPrice} != computed ${expected}`,
    );
  }
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function slugify(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

async function pickRandomFragrances(min: number): Promise<Array<{ record: FragellaRecord; category: FragranceCategory }>> {
  const existing = await db()
    .select({ fragellaId: products.fragellaId })
    .from(products)
    .where(isNotNull(products.fragellaId));
  const existingIds = new Set(existing.map((row) => row.fragellaId));
  const alreadySeeded = existingIds.size;

  const picked: Array<{ record: FragellaRecord; category: FragranceCategory }> = [];
  const pickedIds = new Set<string>();

  for (const entry of shuffle(QUERY_POOL)) {
    if (alreadySeeded + picked.length >= min) break;
    try {
      const record = await lookupFragella(entry.query);
      if (!record || existingIds.has(record.id) || pickedIds.has(record.id)) continue;
      pickedIds.add(record.id);
      picked.push({ record, category: entry.category });
    } catch (err) {
      console.warn(`Fragella lookup failed for "${entry.query}": ${(err as Error).message}`);
    }
  }

  if (alreadySeeded + picked.length < min) {
    console.warn(
      `Only found ${alreadySeeded + picked.length} fragrances (wanted ${min}) — the catalog already has ${alreadySeeded}, and the query pool is exhausted or Fragella lookups failed.`,
    );
  } else {
    console.log(`Picked ${picked.length} new fragrances (catalog already had ${alreadySeeded}).`);
  }

  return picked;
}

async function seedFragrances() {
  const client = db();
  const picks = await pickRandomFragrances(MIN_FRAGRANCES);
  const skuRows: SeedSkuInput[] = [];
  let discountTargetCount = 0;

  for (const [index, { record, category }] of picks.entries()) {
    const concentration = guessConcentration(record.concentration ?? undefined) ?? "EAU_DE_PARFUM";
    const brandSlug = slugify(record.brand || "BRAND");
    const nameSlug = slugify(record.name || "SCENT");
    const costPerMlCentavos = randomInt(3000, 9000);
    const family = record.accords?.[0]?.name ?? null;

    const sharedFields = {
      brand: record.brand || "Unknown house",
      name: record.name || "Untitled",
      family,
      description: record.description ?? null,
      notePyramid: record.notes ?? undefined,
      accords: record.accords ?? null,
      perfumers: record.perfumers ?? null,
      longevity: record.longevity ?? null,
      sillage: record.sillage ?? null,
      priceValue: record.priceValue ?? null,
      longevityBreakout: record.longevityBreakout ?? null,
      sillageBreakout: record.sillageBreakout ?? null,
      priceValueBreakout: record.priceValueBreakout ?? null,
      seasonBreakout: record.seasonBreakout ?? null,
      genderBreakout: record.genderBreakout ?? null,
      relationBreakout: record.relationBreakout ?? null,
      ratingValue: record.ratingValue != null ? String(record.ratingValue) : null,
      ratingCount: record.ratingCount ?? null,
      reviewsCount: record.reviewsCount ?? null,
      releaseYear: record.year ?? null,
      gender: record.gender ?? null,
      fragellaId: record.id,
      fragellaQuery: buildFragellaQuery(record),
      fragellaFetchedAt: new Date(),
      fragellaPayload: record.raw,
    };

    const [fullBottleProduct] = await client
      .insert(products)
      .values({
        type: "FULL_BOTTLE",
        fragranceCategory: category,
        concentration,
        ...sharedFields,
      })
      .returning({ id: products.id });

    const fullBottleCostPrice = costPerMlCentavos * 100;
    const fullBottleMarkup = randomInt(40, 70);
    skuRows.push({
      productId: fullBottleProduct.id,
      sku: `${brandSlug}-${nameSlug}-100`,
      label: "100ml Eau de Parfum",
      sizeMl: 100,
      condition: "BNIB",
      provenance: "RETAIL",
      packaging: "WITH_BOX",
      costPrice: fullBottleCostPrice,
      pricingMode: "PERCENTAGE",
      pricingInput: fullBottleMarkup,
      retailPrice: computeRetailPrice({
        costPriceCentavos: fullBottleCostPrice,
        mode: "PERCENTAGE",
        input: fullBottleMarkup,
      }),
      fulfillment: "PRE_ORDER",
      stock: 0,
      isTester: false,
    });

    const [decantProduct] = await client
      .insert(products)
      .values({
        type: "DECANT",
        fragranceCategory: category,
        concentration,
        sourceMl: 100,
        remainingMl: randomInt(20, 90),
        ...sharedFields,
        description: `Decants of ${record.name}.`,
      })
      .returning({ id: products.id });

    for (const sizeMl of [3, 5, 10] as const) {
      const decantMarkup = randomInt(55, 65);
      const costPrice = costPerMlCentavos * sizeMl;
      skuRows.push({
        productId: decantProduct.id,
        sku: `${brandSlug}-${nameSlug}-${sizeMl}`,
        label: `${sizeMl}ml Decant`,
        sizeMl,
        condition: "SEALED",
        provenance: "TESTER",
        packaging: "BOTTLE_ONLY",
        costPrice,
        pricingMode: "PERCENTAGE",
        pricingInput: decantMarkup,
        retailPrice: computeRetailPrice({
          costPriceCentavos: costPrice,
          mode: "PERCENTAGE",
          input: decantMarkup,
        }),
        // Decant fulfillment/availability is derived from the shared remainingMl pool
        // (see decantFulfillment) — per-SKU stock is unused for this product type.
        fulfillment: "ON_HAND",
        stock: 0,
        isTester: false,
      });
    }

    if (index < 2) {
      skuRows.push({
        productId: decantProduct.id,
        sku: `${brandSlug}-${nameSlug}-T2`,
        label: "2ml Tester",
        sizeMl: 2,
        condition: "FEW_SPRAYS_MISSING",
        provenance: "TESTER",
        packaging: "BOTTLE_ONLY",
        costPrice: costPerMlCentavos * 2,
        pricingMode: "DIRECT",
        pricingInput: 0,
        retailPrice: 0,
        fulfillment: "ON_HAND",
        stock: randomInt(3, 8),
        isTester: true,
        testerFamily: family,
        testerBrand: record.brand || null,
      });
    }

    if (record.imageUrl) {
      await client.insert(productImages).values([
        { productId: fullBottleProduct.id, url: record.imageUrl, alt: `${record.brand} — ${record.name}`, position: 0 },
        { productId: decantProduct.id, url: record.imageUrl, alt: `${record.brand} — ${record.name} decant`, position: 0 },
      ]);
    }

    if (Math.random() < 0.3) {
      discountTargetCount += 1;
      const isPercentage = Math.random() < 0.5;
      await client.insert(productDiscounts).values({
        productId: decantProduct.id,
        type: isPercentage ? "PERCENTAGE" : "FIXED",
        amount: isPercentage ? randomInt(5, 15) : randomInt(5000, 15000),
        isActive: true,
      });
    }
  }

  for (const sku of skuRows) assertPricing(sku);
  if (skuRows.length > 0) {
    await client.insert(skus).values(skuRows).onConflictDoNothing();
  }

  console.log(`Seeded ${picks.length} fragrances (${skuRows.length} SKUs, ${discountTargetCount} discounted).`);
}

async function main() {
  const client = db();

  await seedFragrances();

  await client.insert(promoSettings).values({
    id: "singleton",
    decantThresholdCentavos: 200000,
    deliveryFeeCentavos: 12000,
    freeDeliveryEnabled: true,
    testerBonusEnabled: true,
    decantPreOrderThresholdMl: 10,
  }).onConflictDoNothing();
  await client
    .update(promoSettings)
    .set({ decantPreOrderThresholdMl: 10 })
    .where(eq(promoSettings.id, "singleton"));

  await client.insert(qrCodes).values([
    {
      id: "qr_bpi",
      bankName: "BPI",
      accountName: "Le Sillage PH",
      accountNumber: "0000-0000-00",
      imageUrl: "/placeholder/qr-bpi.svg",
      isActive: true,
      position: 0,
    },
    {
      id: "qr_gcash",
      bankName: "GCash",
      accountName: "Le Sillage PH",
      accountNumber: "0917-000-0000",
      imageUrl: "/placeholder/qr-gcash.svg",
      isActive: true,
      position: 1,
    },
  ]).onConflictDoNothing();

  await client.insert(siteContent).values([
    {
      key: "how-to-pay",
      value:
        "Pay via the QR codes shown at checkout, then upload a screenshot. Free shipping on decant orders ₱2,000+.",
    },
    { key: "faq", value: "We deliver anywhere in Metro Manila. Pickup is at our atelier by appointment." },
    {
      key: "pickup-notes",
      value: "Pickup location and hours are shared by email after order confirmation.",
    },
    { key: "phone", value: "+63 917 000 0000" },
  ]).onConflictDoNothing();

  await client.insert(optionLists).values([
    { key: "fragrance_category", description: "Homepage and catalog shelves" },
    { key: "fragrance_family", description: "Tester grouping for the decant promo" },
    { key: "condition", description: "Product condition states" },
    { key: "provenance", description: "Retail vs tester" },
    { key: "packaging", description: "Box vs bottle-only" },
  ]).onConflictDoNothing();

  const optionSeed: Array<{
    listKey: string;
    value: string;
    label: string;
    position: number;
  }> = [
    { listKey: "fragrance_category", value: "NICHE", label: "Niche", position: 0 },
    { listKey: "fragrance_category", value: "DESIGNER", label: "Designer", position: 1 },
    {
      listKey: "fragrance_category",
      value: "MIDDLE_EASTERN",
      label: "Middle Eastern",
      position: 2,
    },
    { listKey: "fragrance_family", value: "Woody", label: "Woody", position: 0 },
    { listKey: "fragrance_family", value: "Aquatic", label: "Aquatic", position: 1 },
    { listKey: "fragrance_family", value: "Oriental", label: "Oriental", position: 2 },
    { listKey: "fragrance_family", value: "Floral", label: "Floral", position: 3 },
    { listKey: "condition", value: "BNIB", label: "Brand New in Box", position: 0 },
    { listKey: "condition", value: "SEALED", label: "Sealed", position: 1 },
    {
      listKey: "condition",
      value: "FEW_SPRAYS_MISSING",
      label: "A few sprays missing",
      position: 2,
    },
    {
      listKey: "condition",
      value: "PARTIAL_ML",
      label: "Partial — ml only",
      position: 3,
    },
    { listKey: "provenance", value: "RETAIL", label: "Retail", position: 0 },
    { listKey: "provenance", value: "TESTER", label: "Tester", position: 1 },
    { listKey: "packaging", value: "WITH_BOX", label: "With box", position: 0 },
    { listKey: "packaging", value: "BOTTLE_ONLY", label: "Bottle only", position: 1 },
  ];

  await client.insert(optionValues).values(optionSeed).onConflictDoNothing();

  console.log("Seed complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
