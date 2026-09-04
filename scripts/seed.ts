import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { computeRetailPrice, computeSkuRetailPrice } from "@/domain/pricing";
import { guessConcentration } from "@/domain/concentration";
import type { FragranceCategory } from "../src/db/schema";
import { db } from "../src/db/client";
import {
  products,
  skus,
  productDiscounts,
  promoSettings,
  qrCodes,
  siteContent,
  optionLists,
  optionValues,
} from "../src/db/schema";

const MIN_FRAGRANCES = 10;

interface QueryPoolEntry {
  brand: string;
  name: string;
  category: FragranceCategory;
}

// A pool of real, well-known fragrances used to generate demo data — plain
// names only (no live lookup), so notes/accords/images are left blank; fill
// those in per product via the admin edit page if a richer demo is needed.
// We only take MIN_FRAGRANCES of these (chosen at random), so the catalog
// looks different each time `db:seed` runs.
const QUERY_POOL: QueryPoolEntry[] = [
  { brand: "Dior", name: "Sauvage", category: "DESIGNER" },
  { brand: "Chanel", name: "Bleu de Chanel", category: "DESIGNER" },
  { brand: "Yves Saint Laurent", name: "Black Opium", category: "DESIGNER" },
  { brand: "Giorgio Armani", name: "Acqua di Gio", category: "DESIGNER" },
  { brand: "Versace", name: "Eros", category: "DESIGNER" },
  { brand: "Prada", name: "Luna Rossa", category: "DESIGNER" },
  { brand: "Gucci", name: "Bloom", category: "DESIGNER" },
  { brand: "Calvin Klein", name: "CK One", category: "DESIGNER" },
  { brand: "Burberry", name: "Her", category: "DESIGNER" },
  { brand: "Hugo Boss", name: "Bottled", category: "DESIGNER" },
  { brand: "Creed", name: "Aventus", category: "NICHE" },
  { brand: "Le Labo", name: "Santal 33", category: "NICHE" },
  { brand: "Byredo", name: "Gypsy Water", category: "NICHE" },
  { brand: "Maison Francis Kurkdjian", name: "Baccarat Rouge 540", category: "NICHE" },
  { brand: "Amouage", name: "Interlude Man", category: "NICHE" },
  { brand: "Parfums de Marly", name: "Layton", category: "NICHE" },
  { brand: "Initio", name: "Side Effect", category: "NICHE" },
  { brand: "Xerjoff", name: "Naxos", category: "NICHE" },
  { brand: "Lattafa", name: "Khamrah", category: "MIDDLE_EASTERN" },
  { brand: "Ajmal", name: "Amber Wood", category: "MIDDLE_EASTERN" },
  { brand: "Rasasi", name: "Hawas", category: "MIDDLE_EASTERN" },
  { brand: "Afnan", name: "9pm", category: "MIDDLE_EASTERN" },
  { brand: "Swiss Arabian", name: "Shaghaf Oud", category: "MIDDLE_EASTERN" },
];

interface SeedSkuInput {
  productId: string;
  sku: string;
  label: string;
  sizeMl: number;
  condition: "BNIB" | "SEALED" | "FEW_SPRAYS_MISSING";
  provenance: "RETAIL" | "TESTER" | "IN_HOUSE";
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
  // No length cap: a truncated slug risks two different names colliding on
  // the same SKU code (see scripts/import-decant-pricelist.ts's slug(),
  // which had this exact bug at 24 chars and fixed it).
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function pickRandomFragrances(min: number): Promise<QueryPoolEntry[]> {
  const existing = await db()
    .select({ brand: products.brand, name: products.name })
    .from(products);
  const existingKeys = new Set(existing.map((row) => `${row.brand}::${row.name}`.toLowerCase()));
  const alreadySeeded = existingKeys.size;

  const picked: QueryPoolEntry[] = [];
  for (const entry of shuffle(QUERY_POOL)) {
    if (picked.length >= min) break;
    const key = `${entry.brand}::${entry.name}`.toLowerCase();
    if (existingKeys.has(key)) continue;
    picked.push(entry);
  }

  console.log(`Picked ${picked.length} new fragrances (catalog already had ${alreadySeeded}).`);
  return picked;
}

async function seedFragrances() {
  const client = db();
  const picks = await pickRandomFragrances(MIN_FRAGRANCES);
  const skuRows: SeedSkuInput[] = [];
  let discountTargetCount = 0;

  for (const [index, entry] of picks.entries()) {
    const category = entry.category;
    const concentration = guessConcentration(undefined) ?? "EAU_DE_PARFUM";
    const brandSlug = slugify(entry.brand || "BRAND");
    const nameSlug = slugify(entry.name || "SCENT");
    const costPerMlCentavos = randomInt(3000, 9000);
    const family: string | null = null;

    // No live data source for notes/accords/description/images anymore —
    // fill those in per product via the admin edit page if a richer demo is
    // needed.
    const sharedFields = {
      brand: entry.brand || "Unknown house",
      name: entry.name || "Untitled",
      family,
      description: null,
      notePyramid: undefined,
      accords: null,
      perfumers: null,
      longevity: null,
      sillage: null,
      priceValue: null,
      ratingValue: null,
      ratingCount: null,
      reviewsCount: null,
      releaseYear: null,
      gender: null,
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

    if (index < 2) {
      const testerRetailPrice = computeSkuRetailPrice({
        referenceRetailPriceCentavos: fullBottleReference,
        sourceMl: 100,
        sizeMl: 100,
      });
      skuRows.push({
        productId: fullBottleProduct.id,
        sku: `${brandSlug}-${nameSlug}-100-T`,
        label: "100ml Tester",
        sizeMl: 100,
        condition: "SEALED",
        provenance: "TESTER",
        packaging: "BOTTLE_ONLY",
        costPrice: 0,
        pricingMode: "DIRECT",
        pricingInput: testerRetailPrice,
        retailPrice: testerRetailPrice,
        fulfillment: "ON_HAND",
        stock: randomInt(3, 8),
        isTester: true,
        testerFamily: family,
        testerBrand: entry.brand || null,
      });
    }

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
        description: `Decants of ${entry.name}.`,
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
    { listKey: "provenance", value: "RETAIL", label: "Retail", position: 0 },
    { listKey: "provenance", value: "TESTER", label: "Tester", position: 1 },
    { listKey: "provenance", value: "IN_HOUSE", label: "In-house decant", position: 2 },
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
