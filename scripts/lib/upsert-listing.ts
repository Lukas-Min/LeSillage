import { and, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { DECANT_SIZES_ML } from "@/domain/decant";
import { toCentavos } from "@/domain/money";
import { computeRetailPrice, computeSkuRetailPrice, scaleBySize } from "@/domain/pricing";
import { formatFragranceDescription, newSkuFulfillmentDefaults } from "@/domain/product-type";
import { db } from "@/db/client";
import {
  productImages,
  products,
  skus,
  type Condition,
  type Packaging,
  type PricingMode,
  type Provenance,
} from "@/db/schema";

const accordSchema = z.object({
  name: z.string().min(1),
  strength: z.number().optional(),
});

export const listingSchema = z.object({
  brand: z.string().min(1),
  name: z.string().min(1),
  alsoMatchNames: z.array(z.string().min(1)).optional(),
  type: z.enum(["DECANT", "FULL_BOTTLE", "PARTIAL"]),
  fragranceCategory: z.enum(["NICHE", "DESIGNER", "MIDDLE_EASTERN"]),
  concentration: z
    .enum(["EAU_DE_COLOGNE", "EAU_DE_TOILETTE", "EAU_DE_PARFUM", "PARFUM", "EXTRAIT_DE_PARFUM"])
    .optional(),
  gender: z.string().optional(),
  releaseYear: z.number().int().optional(),
  perfumers: z.array(z.string()).optional(),
  notePyramid: z
    .object({
      top: z.array(z.string()),
      middle: z.array(z.string()),
      base: z.array(z.string()),
    })
    .nullable()
    .optional(),
  notes: z.string().optional(),
  accords: z.array(z.union([z.string().min(1), accordSchema])).optional(),
  ratingValue: z.string().nullable().optional(),
  ratingCount: z.number().int().nullable().optional(),
  reviewsCount: z.number().int().nullable().optional(),
  fragranticaUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  imageAlt: z.string().optional(),
  /** When false, an existing photo is left alone. Default replaces it. */
  replaceImage: z.boolean().optional(),
  sourceMl: z.number().int().positive().optional(),
  /** Written only on insert. A re-run never overwrites live remainingMl. */
  remainingMlOnInsert: z.number().int().min(0).optional(),
  costPricePhp: z.number().min(0),
  pricing: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("PERCENTAGE"), percent: z.number().min(0) }),
    z.object({ mode: z.literal("FIXED"), markupPhp: z.number().min(0) }),
    z.object({ mode: z.literal("DIRECT"), retailPricePhp: z.number().min(0) }),
  ]),
  /** When false, an existing SKU keeps its prices and only refreshes code and label. */
  resyncPrices: z.boolean().optional(),
  /** Reprice path: fail if the product row is not already there. */
  requireExisting: z.boolean().optional(),
  sizes: z
    .array(
      z.object({
        sizeMl: z.number().int().positive(),
        label: z.string().optional(),
        provenance: z.enum(["RETAIL", "TESTER", "IN_HOUSE"]).optional(),
        condition: z.enum(["BNIB", "SEALED", "FEW_SPRAYS_MISSING"]).optional(),
        packaging: z.enum(["WITH_BOX", "BOTTLE_ONLY"]).optional(),
        stock: z.number().int().min(0).optional(),
        isTester: z.boolean().optional(),
      }),
    )
    .optional(),
});

export type Listing = z.infer<typeof listingSchema>;

function slug(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function notesFromPyramid(pyramid: { top: string[]; middle: string[]; base: string[] }) {
  return [`Top: ${pyramid.top.join(", ")}`, `Middle: ${pyramid.middle.join(", ")}`, `Base: ${pyramid.base.join(", ")}`].join(
    " | ",
  );
}

function pricingColumns(listing: Listing): { mode: PricingMode; input: number; referenceRetailCentavos: number } {
  const costPrice = toCentavos(listing.costPricePhp);
  switch (listing.pricing.mode) {
    case "PERCENTAGE":
      return {
        mode: "PERCENTAGE",
        input: Math.round(listing.pricing.percent),
        referenceRetailCentavos: computeRetailPrice({
          costPriceCentavos: costPrice,
          mode: "PERCENTAGE",
          input: Math.round(listing.pricing.percent),
        }),
      };
    case "FIXED":
      return {
        mode: "FIXED",
        input: toCentavos(listing.pricing.markupPhp),
        referenceRetailCentavos: computeRetailPrice({
          costPriceCentavos: costPrice,
          mode: "FIXED",
          input: toCentavos(listing.pricing.markupPhp),
        }),
      };
    case "DIRECT":
      return {
        mode: "DIRECT",
        input: toCentavos(listing.pricing.retailPricePhp),
        referenceRetailCentavos: computeRetailPrice({
          costPriceCentavos: costPrice,
          mode: "DIRECT",
          input: toCentavos(listing.pricing.retailPricePhp),
        }),
      };
    default: {
      const exhaustive: never = listing.pricing;
      return exhaustive;
    }
  }
}

function skuRetailCentavos(listing: Listing, referenceRetailCentavos: number, sizeMl: number) {
  if (listing.pricing.mode === "DIRECT" || listing.sourceMl == null) {
    return referenceRetailCentavos;
  }
  return computeSkuRetailPrice({
    referenceRetailPriceCentavos: referenceRetailCentavos,
    sourceMl: listing.sourceMl,
    sizeMl,
  });
}

/**
 * Insert or update one catalog listing from a data object. Pass `apply: false`
 * to print the prices and whether the row already exists, without writing.
 * Re-runs never overwrite `remainingMl`.
 */
export async function upsertListing(raw: unknown, opts: { apply: boolean }): Promise<void> {
  const listing = listingSchema.parse(raw);
  const client = db();
  const costPrice = toCentavos(listing.costPricePhp);
  const pricing = pricingColumns(listing);
  const perfumers = listing.perfumers ?? [];
  const pyramid = listing.notePyramid === undefined ? undefined : listing.notePyramid;
  const notes =
    listing.notes ??
    (pyramid ? notesFromPyramid(pyramid) : undefined);
  const accords = (listing.accords ?? []).map((accord) => (typeof accord === "string" ? { name: accord } : accord));
  const names = [listing.name, ...(listing.alsoMatchNames ?? [])];
  const nameMatch = or(...names.map((name) => ilike(products.name, name)));
  if (!nameMatch) throw new Error("Listing needs a name");
  const where = and(ilike(products.brand, listing.brand), eq(products.type, listing.type), nameMatch);

  const [existing] = await client.select({ id: products.id }).from(products).where(where).limit(1);
  if (!existing && listing.requireExisting) {
    throw new Error(`${listing.type} ${listing.brand} — ${listing.name} not found`);
  }

  const productValues = {
    type: listing.type,
    fragranceCategory: listing.fragranceCategory,
    concentration: listing.concentration ?? null,
    name: listing.name,
    brand: listing.brand,
    gender: listing.gender ?? null,
    releaseYear: listing.releaseYear ?? null,
    perfumers,
    notePyramid: pyramid ?? null,
    notes: notes ?? null,
    accords,
    description: formatFragranceDescription({
      brand: listing.brand,
      perfumers,
      releaseYear: listing.releaseYear ?? null,
    }),
    ratingValue: listing.ratingValue ?? null,
    ratingCount: listing.ratingCount ?? null,
    reviewsCount: listing.reviewsCount ?? null,
    fragranticaUrl: listing.fragranticaUrl ?? null,
    sourceMl: listing.sourceMl ?? null,
    costPrice,
    pricingMode: pricing.mode,
    pricingInput: pricing.input,
    isActive: true,
    updatedAt: new Date(),
  };

  const verb = existing ? "update" : "insert";
  console.log(`${opts.apply ? verb : `would ${verb}`} ${listing.brand} — ${listing.name} (${listing.type})`);

  let productId = existing?.id;
  if (opts.apply) {
    if (existing) {
      await client.update(products).set(productValues).where(eq(products.id, existing.id));
      productId = existing.id;
    } else {
      const [inserted] = await client
        .insert(products)
        .values({ ...productValues, remainingMl: listing.remainingMlOnInsert ?? null })
        .returning({ id: products.id });
      productId = inserted.id;
    }
  }

  const sizes =
    listing.sizes ??
    (listing.type === "DECANT"
      ? DECANT_SIZES_ML.map((sizeMl) => ({ sizeMl }))
      : listing.sourceMl
        ? [{ sizeMl: listing.sourceMl }]
        : []);
  const resyncPrices = listing.resyncPrices !== false;
  const defaults = newSkuFulfillmentDefaults(listing.type);
  const brandSlug = slug(listing.brand);
  const nameSlug = slug(listing.name);

  for (const size of sizes) {
    const retailPrice = skuRetailCentavos(listing, pricing.referenceRetailCentavos, size.sizeMl);
    const costForSize =
      listing.pricing.mode === "DIRECT" || listing.sourceMl == null
        ? costPrice
        : scaleBySize({ referenceCentavos: costPrice, sourceMl: listing.sourceMl, sizeMl: size.sizeMl });
    const provenance: Provenance = size.provenance ?? "RETAIL";
    const condition: Condition = size.condition ?? "BNIB";
    const packaging: Packaging = size.packaging ?? (listing.type === "DECANT" ? "BOTTLE_ONLY" : "WITH_BOX");
    const label = size.label ?? (listing.type === "DECANT" ? `${size.sizeMl}ml Decant` : `${size.sizeMl}ml Full bottle`);
    const skuCode =
      listing.type === "DECANT"
        ? `${brandSlug}-${nameSlug}-${size.sizeMl}ML`
        : `${brandSlug}-${nameSlug}-${size.sizeMl}`;
    console.log(`  ${size.sizeMl}ml -> ₱${(retailPrice / 100).toFixed(2)} (cost ₱${(costForSize / 100).toFixed(2)})`);
    if (!opts.apply || !productId) continue;

    const [existingSku] = await client
      .select({ id: skus.id })
      .from(skus)
      .where(and(eq(skus.productId, productId), eq(skus.sizeMl, size.sizeMl)))
      .limit(1);
    if (existingSku) {
      await client
        .update(skus)
        .set({
          sku: skuCode,
          label,
          ...(resyncPrices
            ? {
                retailPrice,
                costPrice: costForSize,
                pricingMode: "DIRECT" as const,
                pricingInput: retailPrice,
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(skus.id, existingSku.id));
    } else {
      await client.insert(skus).values({
        productId,
        sku: skuCode,
        label,
        sizeMl: size.sizeMl,
        condition,
        provenance,
        packaging,
        costPrice: costForSize,
        pricingMode: "DIRECT",
        pricingInput: retailPrice,
        retailPrice,
        fulfillment: defaults.fulfillment,
        availableForPreOrder: defaults.availableForPreOrder,
        stock: size.stock ?? 0,
        isTester: size.isTester ?? false,
      });
    }
  }

  if (listing.imageUrl && productId && opts.apply) {
    const alt = listing.imageAlt ?? `${listing.brand} — ${listing.name}`;
    const [existingImage] = await client
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .limit(1);
    if (existingImage) {
      if (listing.replaceImage !== false) {
        await client.update(productImages).set({ url: listing.imageUrl, alt }).where(eq(productImages.id, existingImage.id));
      }
    } else {
      await client.insert(productImages).values({ productId, url: listing.imageUrl, alt, position: 0 });
    }
  }

  if (opts.apply && productId) console.log(`✓ ${listing.brand} — ${listing.name} (productId ${productId})`);
}
