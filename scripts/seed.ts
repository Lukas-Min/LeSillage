import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, ilike, isNotNull, or } from "drizzle-orm";
import { computeRetailPrice, computeSkuRetailPrice } from "@/domain/pricing";
import { guessConcentration } from "@/domain/concentration";
import { normalize, searchFragella, buildFragellaQuery, type FragellaRecord } from "@/lib/fragella";
import type { FragranceCategory } from "../src/db/schema";
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
  fragellaMirror,
} from "../src/db/schema";

// Inlined instead of imported from src/lib/fragella-mirror.ts: that module
// starts with `import "server-only"`, which only resolves inside Next's
// build pipeline and crashes a plain tsx script.
async function findOrCacheFragellaRecord(query: string): Promise<FragellaRecord | null> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return null;
  const needle = `%${trimmed.toLowerCase().replace(/%/g, "\\%")}%`;
  const cached = await db()
    .select()
    .from(fragellaMirror)
    .where(or(ilike(fragellaMirror.name, needle), ilike(fragellaMirror.brand, needle), ilike(fragellaMirror.searchName, needle)))
    .limit(1);
  if (cached[0]) return normalize(cached[0].payload as Record<string, unknown>);

  const records = await searchFragella(trimmed, { limit: 1 });
  const record = records[0];
  if (!record || !record.id || !record.name || !record.brand) return null;
  const now = new Date();
  await db()
    .insert(fragellaMirror)
    .values({
      id: record.id,
      name: record.name,
      brand: record.brand,
      year: record.year ?? null,
      gender: record.gender ?? null,
      imageUrl: record.imageUrl ?? null,
      searchName: `${record.brand} ${record.name}`.toLowerCase(),
      payload: record.raw,
      requestCount: 1,
      lastFetchedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
  return record;
}

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
  // Legacy per-SKU pricing columns — no longer used to compute retailPrice
  // (that now derives from the product's costPrice/pricingMode/pricingInput,
  // scaled by sourceMl -> sizeMl). Kept populated only for NOT NULL compliance.
  costPrice: number;
  pricingMode: "DIRECT";
  pricingInput: number;
  retailPrice: number;
  fulfillment: "PRE_ORDER" | "ON_HAND";
  stock: number;
  isTester: boolean;
  testerFamily?: string | null;
  testerBrand?: string | null;
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
      // Checks the local mirror first (src/lib/fragella-mirror.ts) and only
      // hits the live API on a miss, caching the result either way — so a
      // re-seed after purging products doesn't re-spend API quota on
      // fragrances we've already looked up before.
      const record = await findOrCacheFragellaRecord(entry.query);
      if (!record) continue;
      if (existingIds.has(record.id) || pickedIds.has(record.id)) continue;
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

    // Product-level pricing formula: one reference retail price per product
    // (cost run through the pricing mode), from which every SKU's price
    // derives as reference / sourceMl * sizeMl. Full bottles have sourceMl
    // equal to their own sizeMl (ratio 1); decants share one reference
    // across all their sizes.
    const fullBottleCostPrice = costPerMlCentavos * 100;
    const fullBottleMarkup = randomInt(40, 70);
    const fullBottleReference = computeRetailPrice({
      costPriceCentavos: fullBottleCostPrice,
      mode: "PERCENTAGE",
      input: fullBottleMarkup,
    });

    const [fullBottleProduct] = await client
      .insert(products)
      .values({
        type: "FULL_BOTTLE",
        fragranceCategory: category,
        concentration,
        sourceMl: 100,
        costPrice: fullBottleCostPrice,
        pricingMode: "PERCENTAGE",
        pricingInput: fullBottleMarkup,
        ...sharedFields,
      })
      .returning({ id: products.id });

    skuRows.push({
      productId: fullBottleProduct.id,
      sku: `${brandSlug}-${nameSlug}-100`,
      label: "100ml Eau de Parfum",
      sizeMl: 100,
      condition: "BNIB",
      provenance: "RETAIL",
      packaging: "WITH_BOX",
      costPrice: 0,
      pricingMode: "DIRECT",
      pricingInput: fullBottleReference,
      retailPrice: computeSkuRetailPrice({
        referenceRetailPriceCentavos: fullBottleReference,
        sourceMl: 100,
        sizeMl: 100,
      }),
      fulfillment: "PRE_ORDER",
      stock: 0,
      isTester: false,
    });

    const decantCostPrice = costPerMlCentavos * 100;
    const decantMarkup = 30;
    const decantReference = computeRetailPrice({
      costPriceCentavos: decantCostPrice,
      mode: "PERCENTAGE",
      input: decantMarkup,
    });

    const [decantProduct] = await client
      .insert(products)
      .values({
        type: "DECANT",
        fragranceCategory: category,
        concentration,
        sourceMl: 100,
        remainingMl: randomInt(20, 90),
        costPrice: decantCostPrice,
        pricingMode: "PERCENTAGE",
        pricingInput: decantMarkup,
        ...sharedFields,
        description: `Decants of ${record.name}.`,
      })
      .returning({ id: products.id });

    for (const sizeMl of [3, 5, 10] as const) {
      const retailPrice = computeSkuRetailPrice({
        referenceRetailPriceCentavos: decantReference,
        sourceMl: 100,
        sizeMl,
      });
      skuRows.push({
        productId: decantProduct.id,
        sku: `${brandSlug}-${nameSlug}-${sizeMl}`,
        label: `${sizeMl}ml Decant`,
        sizeMl,
        condition: "SEALED",
        provenance: "TESTER",
        packaging: "BOTTLE_ONLY",
        costPrice: 0,
        pricingMode: "DIRECT",
        pricingInput: retailPrice,
        retailPrice,
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
        costPrice: 0,
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
