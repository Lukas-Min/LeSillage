import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, inArray } from "drizzle-orm";
import { computeRetailPrice } from "@/domain/pricing";
import type { PricingMode } from "../src/db/schema";
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

interface SeedSkuInput {
  id: string;
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
      `Seed mismatch on ${sku.id}: stored retail ${sku.retailPrice} != computed ${expected}`,
    );
  }
}

async function main() {
  const client = db();

  await client.insert(products)
    .values([
      {
        id: "p_velvet_oud",
        type: "FULL_BOTTLE",
        fragranceCategory: "DESIGNER",
        name: "Velvet Oud",
        brand: "Maison Ivre",
        family: "Woody",
        description: "A rich oud with saffron, rose, and amber. Confident and warm.",
        notes: "Long-lasting; ideal for cooler Manila evenings.",
      },
      {
        id: "p_salt_breeze",
        type: "FULL_BOTTLE",
        fragranceCategory: "MIDDLE_EASTERN",
        name: "Salt Breeze",
        brand: "Casa Luz",
        family: "Aquatic",
        description: "Crisp bergamot, sea salt, and white musk.",
        notes: "Light and airy for daytime.",
      },
      {
        id: "p_amber_ember",
        type: "PARTIAL",
        fragranceCategory: "DESIGNER",
        name: "Amber Ember",
        brand: "Maison Ivre",
        family: "Oriental",
        description: "Honeyed amber and tonka. Decanted from a tester bottle.",
        notes: "Tester — bottle only.",
      },
      {
        id: "p_velvet_oud_decant",
        type: "DECANT",
        fragranceCategory: "DESIGNER",
        name: "Velvet Oud",
        brand: "Maison Ivre",
        family: "Woody",
        description: "Decants of Velvet Oud from a sealed tester bottle. 3ml, 5ml, 10ml, and 30ml.",
        sourceMl: 100,
        remainingMl: 80,
      },
      {
        id: "p_salt_breeze_decant",
        type: "DECANT",
        fragranceCategory: "MIDDLE_EASTERN",
        name: "Salt Breeze",
        brand: "Casa Luz",
        family: "Aquatic",
        description: "Decants of Salt Breeze. Listed sizes stay available; low millilitres switch to pre-order.",
        sourceMl: 100,
        remainingMl: 8,
      },
      {
        id: "p_oud_royal_decant",
        type: "DECANT",
        fragranceCategory: "NICHE",
        name: "Oud Royal",
        brand: "Maison Ivre",
        family: "Woody",
        description: "Decants of Oud Royal.",
        sourceMl: 100,
        remainingMl: 50,
      },
      {
        id: "p_tester_velvet",
        type: "DECANT",
        fragranceCategory: "DESIGNER",
        name: "Velvet Oud Tester (2ml)",
        brand: "Maison Ivre",
        family: "Woody",
        description: "Tester vial awarded with the decant promo when available.",
      },
      {
        id: "p_tester_salt",
        type: "DECANT",
        fragranceCategory: "MIDDLE_EASTERN",
        name: "Salt Breeze Tester (2ml)",
        brand: "Casa Luz",
        family: "Aquatic",
        description: "Tester vial awarded with the decant promo when available.",
      },
      {
        id: "p_oud_royal",
        type: "FULL_BOTTLE",
        fragranceCategory: "NICHE",
        name: "Oud Royal",
        brand: "Maison Ivre",
        family: "Woody",
        description: "Premium oud with saffron and rose petals.",
      },
    ])
    .onConflictDoNothing();

  const skuRows: SeedSkuInput[] = [
    {
      id: "sku_velvet_full",
      productId: "p_velvet_oud",
      sku: "MI-VELOUD-100",
      label: "100ml Eau de Parfum",
      sizeMl: 100,
      condition: "BNIB",
      provenance: "RETAIL",
      packaging: "WITH_BOX",
      costPrice: 550000,
      pricingMode: "PERCENTAGE",
      pricingInput: 60,
      retailPrice: 880000,
      fulfillment: "PRE_ORDER",
      stock: 0,
      isTester: false,
    },
    {
      id: "sku_salt_full",
      productId: "p_salt_breeze",
      sku: "CL-SALT-100",
      label: "100ml Eau de Toilette",
      sizeMl: 100,
      condition: "BNIB",
      provenance: "RETAIL",
      packaging: "WITH_BOX",
      costPrice: 380000,
      pricingMode: "PERCENTAGE",
      pricingInput: 50,
      retailPrice: 570000,
      fulfillment: "PRE_ORDER",
      stock: 0,
      isTester: false,
    },
    {
      id: "sku_amber_partial",
      productId: "p_amber_ember",
      sku: "MI-AMBER-30",
      label: "30ml Partial Bottle",
      sizeMl: 30,
      condition: "PARTIAL_ML",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 280000,
      pricingMode: "FIXED",
      pricingInput: 140000,
      retailPrice: 420000,
      fulfillment: "ON_HAND",
      stock: 3,
      isTester: false,
    },
    {
      id: "sku_velvet_3",
      productId: "p_velvet_oud_decant",
      sku: "MI-VELOUD-3",
      label: "3ml Decant",
      sizeMl: 3,
      condition: "SEALED",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 33000,
      pricingMode: "PERCENTAGE",
      pricingInput: 60,
      retailPrice: 52800,
      fulfillment: "ON_HAND",
      stock: 99,
      isTester: false,
    },
    {
      id: "sku_velvet_5",
      productId: "p_velvet_oud_decant",
      sku: "MI-VELOUD-5",
      label: "5ml Decant",
      sizeMl: 5,
      condition: "SEALED",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 55000,
      pricingMode: "PERCENTAGE",
      pricingInput: 60,
      retailPrice: 88000,
      fulfillment: "ON_HAND",
      stock: 99,
      isTester: false,
    },
    {
      id: "sku_velvet_10",
      productId: "p_velvet_oud_decant",
      sku: "MI-VELOUD-10",
      label: "10ml Decant",
      sizeMl: 10,
      condition: "SEALED",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 100000,
      pricingMode: "PERCENTAGE",
      pricingInput: 65,
      retailPrice: 165000,
      fulfillment: "ON_HAND",
      stock: 99,
      isTester: false,
    },
    {
      id: "sku_velvet_30",
      productId: "p_velvet_oud_decant",
      sku: "MI-VELOUD-30",
      label: "30ml Decant",
      sizeMl: 30,
      condition: "SEALED",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 300000,
      pricingMode: "PERCENTAGE",
      pricingInput: 60,
      retailPrice: 480000,
      fulfillment: "ON_HAND",
      stock: 99,
      isTester: false,
    },
    {
      id: "sku_salt_3",
      productId: "p_salt_breeze_decant",
      sku: "CL-SALT-3",
      label: "3ml Decant",
      sizeMl: 3,
      condition: "SEALED",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 24000,
      pricingMode: "PERCENTAGE",
      pricingInput: 60,
      retailPrice: 38400,
      fulfillment: "PRE_ORDER",
      stock: 99,
      isTester: false,
    },
    {
      id: "sku_salt_5",
      productId: "p_salt_breeze_decant",
      sku: "CL-SALT-5",
      label: "5ml Decant",
      sizeMl: 5,
      condition: "SEALED",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 40000,
      pricingMode: "PERCENTAGE",
      pricingInput: 60,
      retailPrice: 64000,
      fulfillment: "PRE_ORDER",
      stock: 99,
      isTester: false,
    },
    {
      id: "sku_salt_10",
      productId: "p_salt_breeze_decant",
      sku: "CL-SALT-10",
      label: "10ml Decant",
      sizeMl: 10,
      condition: "SEALED",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 80000,
      pricingMode: "PERCENTAGE",
      pricingInput: 60,
      retailPrice: 128000,
      fulfillment: "PRE_ORDER",
      stock: 99,
      isTester: false,
    },
    {
      id: "sku_salt_30",
      productId: "p_salt_breeze_decant",
      sku: "CL-SALT-30",
      label: "30ml Decant",
      sizeMl: 30,
      condition: "SEALED",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 240000,
      pricingMode: "PERCENTAGE",
      pricingInput: 60,
      retailPrice: 384000,
      fulfillment: "PRE_ORDER",
      stock: 99,
      isTester: false,
    },
    {
      id: "sku_oudroyal_full",
      productId: "p_oud_royal",
      sku: "MI-OUDR-100",
      label: "100ml Eau de Parfum",
      sizeMl: 100,
      condition: "BNIB",
      provenance: "RETAIL",
      packaging: "WITH_BOX",
      costPrice: 1200000,
      pricingMode: "PERCENTAGE",
      pricingInput: 40,
      retailPrice: 1680000,
      fulfillment: "PRE_ORDER",
      stock: 0,
      isTester: false,
    },
    {
      id: "sku_oudroyal_5",
      productId: "p_oud_royal_decant",
      sku: "MI-OUDR-5",
      label: "5ml Decant",
      sizeMl: 5,
      condition: "SEALED",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 120000,
      pricingMode: "PERCENTAGE",
      pricingInput: 60,
      retailPrice: 192000,
      fulfillment: "ON_HAND",
      stock: 99,
      isTester: false,
    },
    {
      id: "sku_oudroyal_3",
      productId: "p_oud_royal_decant",
      sku: "MI-OUDR-3",
      label: "3ml Decant",
      sizeMl: 3,
      condition: "SEALED",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 72000,
      pricingMode: "PERCENTAGE",
      pricingInput: 60,
      retailPrice: 115200,
      fulfillment: "ON_HAND",
      stock: 99,
      isTester: false,
    },
    {
      id: "sku_oudroyal_10",
      productId: "p_oud_royal_decant",
      sku: "MI-OUDR-10",
      label: "10ml Decant",
      sizeMl: 10,
      condition: "SEALED",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 240000,
      pricingMode: "PERCENTAGE",
      pricingInput: 60,
      retailPrice: 384000,
      fulfillment: "ON_HAND",
      stock: 99,
      isTester: false,
    },
    {
      id: "sku_oudroyal_30",
      productId: "p_oud_royal_decant",
      sku: "MI-OUDR-30",
      label: "30ml Decant",
      sizeMl: 30,
      condition: "SEALED",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 720000,
      pricingMode: "PERCENTAGE",
      pricingInput: 60,
      retailPrice: 1152000,
      fulfillment: "ON_HAND",
      stock: 99,
      isTester: false,
    },
    {
      id: "sku_tester_velvet",
      productId: "p_tester_velvet",
      sku: "MI-VELOUD-T2",
      label: "2ml Tester",
      sizeMl: 2,
      condition: "FEW_SPRAYS_MISSING",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 8000,
      pricingMode: "DIRECT",
      pricingInput: 0,
      retailPrice: 0,
      fulfillment: "ON_HAND",
      stock: 6,
      isTester: true,
      testerFamily: "Woody",
      testerBrand: "Maison Ivre",
    },
    {
      id: "sku_tester_salt",
      productId: "p_tester_salt",
      sku: "CL-SALT-T2",
      label: "2ml Tester",
      sizeMl: 2,
      condition: "FEW_SPRAYS_MISSING",
      provenance: "TESTER",
      packaging: "BOTTLE_ONLY",
      costPrice: 8000,
      pricingMode: "DIRECT",
      pricingInput: 0,
      retailPrice: 0,
      fulfillment: "ON_HAND",
      stock: 4,
      isTester: true,
      testerFamily: "Aquatic",
      testerBrand: "Casa Luz",
    },
  ];

  for (const sku of skuRows) assertPricing(sku);

  await client.insert(skus).values(skuRows).onConflictDoNothing();

  const reparent: Array<{ id: string; productId: string }> = [
    { id: "sku_velvet_5", productId: "p_velvet_oud_decant" },
    { id: "sku_velvet_10", productId: "p_velvet_oud_decant" },
    { id: "sku_salt_5", productId: "p_salt_breeze_decant" },
    { id: "sku_oudroyal_5", productId: "p_oud_royal_decant" },
  ];
  for (const row of reparent) {
    await client.update(skus).set({ productId: row.productId }).where(eq(skus.id, row.id));
  }
  await client
    .update(products)
    .set({ isActive: false })
    .where(
      inArray(products.id, [
        "p_velvet_oud_5ml",
        "p_velvet_oud_10ml",
        "p_salt_breeze_5ml",
        "p_oud_royal_5ml",
      ]),
    );
  await client
    .update(products)
    .set({ remainingMl: 80, sourceMl: 100 })
    .where(eq(products.id, "p_velvet_oud_decant"));
  await client
    .update(products)
    .set({ remainingMl: 8, sourceMl: 100 })
    .where(eq(products.id, "p_salt_breeze_decant"));
  await client
    .update(products)
    .set({ remainingMl: 50, sourceMl: 100 })
    .where(eq(products.id, "p_oud_royal_decant"));

  await client.insert(productImages).values([
    {
      productId: "p_velvet_oud",
      url: "/placeholder/velvet-oud.svg",
      alt: "Velvet Oud bottle",
      position: 0,
    },
    {
      productId: "p_salt_breeze",
      url: "/placeholder/salt-breeze.svg",
      alt: "Salt Breeze bottle",
      position: 0,
    },
    {
      productId: "p_velvet_oud_decant",
      url: "/placeholder/velvet-oud.svg",
      alt: "Velvet Oud decant",
      position: 0,
    },
  ]).onConflictDoNothing();

  await client.insert(productDiscounts).values([
    { productId: "p_velvet_oud_decant", type: "PERCENTAGE", amount: 5, isActive: true },
    { productId: "p_salt_breeze_decant", type: "FIXED", amount: 10000, isActive: true },
    { productId: "p_oud_royal_decant", type: "PERCENTAGE", amount: 10, isActive: true },
  ]).onConflictDoNothing();

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
