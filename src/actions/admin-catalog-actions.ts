"use server";

import { revalidatePath } from "next/cache";
import { count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { db } from "@/db/client";
import {
  cartItems,
  orderItems,
  productDiscounts,
  productImages,
  products,
  skus,
  stockMovements,
  wishlists,
  type Concentration,
  type Condition,
  type FragranceCategory,
  type Fulfillment,
  type Packaging,
  type PricingMode,
  type ProductType,
  type Provenance,
} from "@/db/schema";
import { computeRetailPrice, computeSkuRetailPrice, scaleBySize } from "@/domain/pricing";
import { toCentavos } from "@/domain/money";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import { uploadPublicImage } from "@/lib/blob";
import { clampRemainingMl } from "@/domain/decant";

function skuSlugPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Derives a readable, unique SKU code from the product's brand/name and the
 *  SKU's own size (or label, if sizeless) — e.g. "LATTAFA-KHAMRAH-10". The
 *  admin never types this; it's generated once at creation and never
 *  changes, so every SKU code is guaranteed system-issued. Collisions
 *  (e.g. two 10ml SKUs on the same product) get a "-2", "-3"... suffix. */
async function generateSkuCode(product: { brand: string; name: string }, sizeMl: number | null, label: string) {
  const base = [skuSlugPart(product.brand), skuSlugPart(product.name), sizeMl ? String(sizeMl) : skuSlugPart(label)]
    .filter(Boolean)
    .join("-");
  let candidate = base;
  let suffix = 1;
  for (;;) {
    const existing = await db().select({ id: skus.id }).from(skus).where(eq(skus.sku, candidate)).limit(1);
    if (existing.length === 0) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

async function limitAdmin(adminId: string, key: string) {
  const decision = await rateLimit({
    bucket: "ACCOUNT",
    key: await getRequestKey(key, adminId),
    limit: 40,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");
}

/** Recomputes every SKU's retail/cost from the product formula (scaled by
 *  sourceMl → sizeMl) and keeps the DIRECT cache (pricingMode/pricingInput)
 *  in sync. Only a RETAIL decant is skipped — it's priced independently. */
async function resyncSkuPricesForProduct(
  productId: string,
  product: {
    type: ProductType;
    costPrice: number;
    pricingMode: PricingMode;
    pricingInput: number;
    sourceMl: number | null;
  },
) {
  const referenceRetailPriceCentavos = computeRetailPrice({
    costPriceCentavos: product.costPrice,
    mode: product.pricingMode,
    input: product.pricingInput,
  });
  const productSkus = await db()
    .select({ id: skus.id, sizeMl: skus.sizeMl, provenance: skus.provenance })
    .from(skus)
    .where(eq(skus.productId, productId));
  for (const sku of productSkus) {
    if (product.type === "DECANT" && sku.provenance === "RETAIL") continue;
    const retailPrice = computeSkuRetailPrice({
      referenceRetailPriceCentavos,
      sourceMl: product.sourceMl,
      sizeMl: sku.sizeMl,
    });
    const costPrice = scaleBySize({ referenceCentavos: product.costPrice, sourceMl: product.sourceMl, sizeMl: sku.sizeMl });
    await db()
      .update(skus)
      .set({ retailPrice, costPrice, pricingMode: "DIRECT", pricingInput: retailPrice, updatedAt: new Date() })
      .where(eq(skus.id, sku.id));
  }
  return referenceRetailPriceCentavos;
}

const productSchema = z.object({
  productId: z.string().optional(),
  type: z.enum(["FULL_BOTTLE", "PARTIAL", "DECANT"]),
  fragranceCategory: z.enum(["NICHE", "DESIGNER", "MIDDLE_EASTERN"]),
  concentration: z
    .enum(["EAU_DE_COLOGNE", "EAU_DE_TOILETTE", "EAU_DE_PARFUM", "PARFUM", "EXTRAIT_DE_PARFUM"])
    .optional(),
  name: z.string().min(2).max(160),
  brand: z.string().min(1).max(120),
  family: z.string().max(80).optional(),
  gender: z.enum(["men", "women", "unisex"]).optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  sourceMl: z.coerce.number().int().min(0).optional(),
  remainingMl: z.coerce.number().int().min(0).optional(),
  // Entered in pesos (decimals allowed for centavos, e.g. "3500.50"), converted
  // to centavos below — NOT raw centavos. See src/domain/money.ts#toCentavos.
  costPrice: z.coerce.number().min(0),
  pricingMode: z.enum(["PERCENTAGE", "FIXED", "DIRECT"]),
  // Pesos for FIXED/DIRECT (converted to centavos below); a plain percent
  // number for PERCENTAGE (no conversion — it's not a currency amount).
  pricingInput: z.coerce.number().min(0),
  isActive: z.boolean(),
});

export async function upsertProduct(formData: FormData) {
  const admin = await requireAdmin();
  await limitAdmin(admin.id, "product-upsert");
  const parsed = productSchema.parse({
    productId: formData.get("productId") || undefined,
    type: formData.get("type"),
    fragranceCategory: formData.get("fragranceCategory"),
    concentration: formData.get("concentration") || undefined,
    name: formData.get("name"),
    brand: formData.get("brand"),
    family: formData.get("family") || undefined,
    gender: formData.get("gender") || undefined,
    description: formData.get("description") || undefined,
    notes: formData.get("notes") || undefined,
    sourceMl: formData.get("sourceMl") || undefined,
    remainingMl: formData.get("remainingMl") || undefined,
    costPrice: formData.get("costPrice"),
    pricingMode: formData.get("pricingMode"),
    pricingInput: formData.get("pricingInput"),
    isActive: formData.get("isActive") === "on",
  });
  const values = {
    type: parsed.type as ProductType,
    fragranceCategory: parsed.fragranceCategory as FragranceCategory,
    concentration: (parsed.concentration as Concentration | undefined) ?? null,
    name: parsed.name,
    brand: parsed.brand,
    family: parsed.family ?? null,
    gender: parsed.gender ?? null,
    description: parsed.description ?? null,
    notes: parsed.notes ?? null,
    sourceMl: parsed.sourceMl ?? null,
    remainingMl: parsed.type === "DECANT" ? clampRemainingMl(parsed.remainingMl ?? 0) : null,
    costPrice: toCentavos(parsed.costPrice),
    pricingMode: parsed.pricingMode as PricingMode,
    pricingInput:
      parsed.pricingMode === "PERCENTAGE" ? Math.round(parsed.pricingInput) : toCentavos(parsed.pricingInput),
    isActive: parsed.isActive,
    updatedAt: new Date(),
  };
  if (parsed.productId) {
    await db().update(products).set(values).where(eq(products.id, parsed.productId));
    await resyncSkuPricesForProduct(parsed.productId, values);
    await auditLogSubject({
      actor: admin.id,
      action: "PRODUCT_UPDATE",
      targetType: "product",
      targetId: parsed.productId,
    });
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${parsed.productId}`);
    return;
  }
  const inserted = await db().insert(products).values(values).returning();
  await auditLogSubject({
    actor: admin.id,
    action: "PRODUCT_CREATE",
    targetType: "product",
    targetId: inserted[0].id,
  });
  revalidatePath("/admin/products");
  return inserted[0].id;
}

const skuSchema = z.object({
  skuId: z.string().optional(),
  productId: z.string().min(1),
  // No "sku" field: the code is system-generated on creation (see
  // generateSkuCode) and never re-derived on edit — the admin can't set or
  // change it, so it's not part of the submitted form at all.
  label: z.string().min(1).max(120),
  sizeMl: z.coerce.number().int().min(0).optional(),
  condition: z.enum(["BNIB", "SEALED", "FEW_SPRAYS_MISSING"]),
  provenance: z.enum(["RETAIL", "TESTER", "IN_HOUSE"]),
  packaging: z.enum(["WITH_BOX", "BOTTLE_ONLY"]),
  fulfillment: z.enum(["PRE_ORDER", "ON_HAND"]),
  stock: z.coerce.number().int().min(0),
  isTester: z.boolean(),
  isActive: z.boolean(),
  // Only present (and only honored) for a RETAIL-provenance decant SKU — see
  // below. manualCostPrice is entered in pesos; manualPricingInput is pesos
  // for FIXED/DIRECT, a plain percent for PERCENTAGE (same convention as the
  // product's own costPrice/pricingInput fields).
  manualCostPrice: z.coerce.number().min(0).optional(),
  manualPricingMode: z.enum(["PERCENTAGE", "FIXED", "DIRECT"]).optional(),
  manualPricingInput: z.coerce.number().min(0).optional(),
});

export async function upsertSku(formData: FormData) {
  const admin = await requireAdmin();
  await limitAdmin(admin.id, "sku-upsert");
  const parsed = skuSchema.parse({
    skuId: formData.get("skuId") || undefined,
    productId: formData.get("productId"),
    label: formData.get("label"),
    sizeMl: formData.get("sizeMl") || undefined,
    condition: formData.get("condition"),
    provenance: formData.get("provenance"),
    packaging: formData.get("packaging"),
    fulfillment: formData.get("fulfillment"),
    stock: formData.get("stock"),
    isTester: formData.get("isTester") === "on",
    isActive: formData.get("isActive") === "on",
    manualCostPrice: formData.get("manualCostPrice") || undefined,
    manualPricingMode: formData.get("manualPricingMode") || undefined,
    manualPricingInput: formData.get("manualPricingInput") || undefined,
  });
  const product = (
    await db()
      .select({
        brand: products.brand,
        name: products.name,
        type: products.type,
        costPrice: products.costPrice,
        pricingMode: products.pricingMode,
        pricingInput: products.pricingInput,
        sourceMl: products.sourceMl,
      })
      .from(products)
      .where(eq(products.id, parsed.productId))
  )[0];
  if (!product) throw new Error("Product not found");
  // A RETAIL decant is a distinct physical unit bought pre-made from the
  // perfumery — its cost/price genuinely aren't derived from this product's
  // reference formula (that formula assumes scaling a whole bottle you own
  // down to a decant size), so it gets its own Cost price run through its
  // own Percentage/Fixed/Direct pricing formula (same mechanism as the
  // product's), instead of the usual sourceMl->sizeMl scaling. Every other
  // SKU (IN_HOUSE decant, or any full-bottle/partial) keeps the computed
  // path, and just caches the resolved price as DIRECT/retailPrice.
  const isRetailDecant = product.type === "DECANT" && parsed.provenance === "RETAIL";
  let retailPrice: number;
  let costPrice: number;
  let pricingMode: PricingMode;
  let pricingInput: number;
  if (isRetailDecant && parsed.manualPricingMode) {
    costPrice = parsed.manualCostPrice != null ? toCentavos(parsed.manualCostPrice) : 0;
    pricingMode = parsed.manualPricingMode as PricingMode;
    pricingInput =
      pricingMode === "PERCENTAGE" ? Math.round(parsed.manualPricingInput ?? 0) : toCentavos(parsed.manualPricingInput ?? 0);
    retailPrice = computeRetailPrice({ costPriceCentavos: costPrice, mode: pricingMode, input: pricingInput });
  } else {
    const referenceRetailPriceCentavos = computeRetailPrice({
      costPriceCentavos: product.costPrice ?? 0,
      mode: product.pricingMode,
      input: product.pricingInput,
    });
    retailPrice = computeSkuRetailPrice({
      referenceRetailPriceCentavos,
      sourceMl: product.sourceMl,
      sizeMl: parsed.sizeMl ?? null,
    });
    costPrice = scaleBySize({ referenceCentavos: product.costPrice ?? 0, sourceMl: product.sourceMl, sizeMl: parsed.sizeMl ?? null });
    pricingMode = "DIRECT";
    pricingInput = retailPrice;
  }
  const values = {
    productId: parsed.productId,
    label: parsed.label,
    sizeMl: parsed.sizeMl ?? null,
    condition: parsed.condition as Condition,
    provenance: parsed.provenance as Provenance,
    packaging: parsed.packaging as Packaging,
    costPrice,
    pricingMode,
    pricingInput,
    retailPrice,
    fulfillment: parsed.fulfillment as Fulfillment,
    stock: parsed.stock,
    isTester: parsed.isTester,
    isActive: parsed.isActive,
    updatedAt: new Date(),
  };
  if (parsed.skuId) {
    // "sku" is deliberately absent from `values` — the code is set once at
    // creation and never re-derived on edit.
    await db().update(skus).set(values).where(eq(skus.id, parsed.skuId));
    await auditLogSubject({
      actor: admin.id,
      action: "SKU_UPDATE",
      targetType: "sku",
      targetId: parsed.skuId,
    });
  } else {
    const sku = await generateSkuCode(product, parsed.sizeMl ?? null, parsed.label);
    const inserted = await db().insert(skus).values({ ...values, sku }).returning();
    await auditLogSubject({
      actor: admin.id,
      action: "SKU_CREATE",
      targetType: "sku",
      targetId: inserted[0].id,
    });
  }
  revalidatePath(`/admin/products/${parsed.productId}`);
  revalidatePath("/shop");
}

export async function adjustDecantMl(formData: FormData) {
  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const remainingMl = clampRemainingMl(Number(formData.get("remainingMl")));
  const note = String(formData.get("note") ?? "");
  await db().update(products).set({ remainingMl, updatedAt: new Date() }).where(eq(products.id, productId));
  const sku = (await db().select({ id: skus.id }).from(skus).where(eq(skus.productId, productId)))[0];
  if (sku) {
    await db().insert(stockMovements).values({
      skuId: sku.id,
      delta: remainingMl,
      reason: "ML_ADJUST",
      note: note || "Admin ml pool adjustment",
    });
  }
  await auditLogSubject({
    actor: admin.id,
    action: "ML_ADJUST",
    targetType: "product",
    targetId: productId,
    metadata: { remainingMl },
  });
  revalidatePath(`/admin/products/${productId}`);
}

async function referenceCounts(productId: string) {
  const skuIds = (await db().select({ id: skus.id }).from(skus).where(eq(skus.productId, productId))).map((s) => s.id);
  const orderCount =
    skuIds.length === 0
      ? 0
      : Number((await db().select({ value: count() }).from(orderItems).where(inArray(orderItems.skuId, skuIds)))[0]?.value ?? 0);
  const cartCount =
    skuIds.length === 0
      ? 0
      : Number((await db().select({ value: count() }).from(cartItems).where(inArray(cartItems.skuId, skuIds)))[0]?.value ?? 0);
  const wishCount = Number(
    (await db().select({ value: count() }).from(wishlists).where(eq(wishlists.productId, productId)))[0]?.value ?? 0,
  );
  return { orderCount, cartCount, wishCount };
}

export async function archiveOrDeleteProduct(formData: FormData) {
  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const refs = await referenceCounts(productId);
  if (refs.orderCount > 0 || refs.cartCount > 0 || refs.wishCount > 0) {
    await db().update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, productId));
    await db().update(skus).set({ isActive: false, updatedAt: new Date() }).where(eq(skus.productId, productId));
    await auditLogSubject({
      actor: admin.id,
      action: "PRODUCT_ARCHIVE",
      targetType: "product",
      targetId: productId,
    });
  } else {
    await db().delete(products).where(eq(products.id, productId));
    await auditLogSubject({
      actor: admin.id,
      action: "PRODUCT_DELETE",
      targetType: "product",
      targetId: productId,
    });
  }
  revalidatePath("/admin/products");
}

export async function archiveOrDeleteSku(formData: FormData) {
  const admin = await requireAdmin();
  const skuId = String(formData.get("skuId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const orderCount = Number((await db().select({ value: count() }).from(orderItems).where(eq(orderItems.skuId, skuId)))[0]?.value ?? 0);
  const cartCount = Number((await db().select({ value: count() }).from(cartItems).where(eq(cartItems.skuId, skuId)))[0]?.value ?? 0);
  if (orderCount > 0 || cartCount > 0) {
    await db().update(skus).set({ isActive: false, updatedAt: new Date() }).where(eq(skus.id, skuId));
    await auditLogSubject({ actor: admin.id, action: "SKU_UPDATE", targetType: "sku", targetId: skuId, metadata: { archived: true } });
  } else {
    await db().delete(skus).where(eq(skus.id, skuId));
    await auditLogSubject({ actor: admin.id, action: "SKU_DELETE", targetType: "sku", targetId: skuId });
  }
  revalidatePath(`/admin/products/${productId}`);
}

export async function upsertDiscount(formData: FormData) {
  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const type = z.enum(["PERCENTAGE", "FIXED"]).parse(formData.get("type"));
  // Entered in pesos for FIXED (converted to centavos below); a plain percent for PERCENTAGE.
  const rawAmount = z.coerce.number().min(1).parse(formData.get("amount"));
  const amount = type === "FIXED" ? toCentavos(rawAmount) : Math.round(rawAmount);
  await db().insert(productDiscounts).values({ productId, type, amount, isActive: true });
  await auditLogSubject({ actor: admin.id, action: "DISCOUNT_UPDATE", targetType: "product", targetId: productId });
  revalidatePath(`/admin/products/${productId}`);
}

export async function removeProductImage(formData: FormData) {
  const admin = await requireAdmin();
  const imageId = String(formData.get("imageId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  await db().delete(productImages).where(eq(productImages.id, imageId));
  await auditLogSubject({
    actor: admin.id,
    action: "IMAGE_UPDATE",
    targetType: "product",
    targetId: productId,
    metadata: { removed: imageId },
  });
  revalidatePath(`/admin/products/${productId}`);
}

/** Adds a product image either from an uploaded file or a pasted URL — one
 *  form, one Alt text field, whichever of the two the admin actually filled
 *  in. A pasted URL skips the Blob upload entirely (same as how a
 *  Fragrantica-imported product's photo already ends up here: a plain
 *  external URL in `productImages.url`) — useful for reusing an image
 *  that's already hosted somewhere instead of downloading and re-uploading
 *  it as a file. */
export async function addProductImage(formData: FormData) {
  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("file");
  const rawUrl = String(formData.get("url") ?? "").trim();
  let url: string;
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadPublicImage(`products/${productId}`, {
      name: file.name,
      type: file.type,
      bytes: await file.arrayBuffer(),
    });
    url = uploaded.url;
  } else if (rawUrl) {
    url = z.string().trim().url().parse(rawUrl);
  } else {
    throw new Error("Choose a file or paste an image URL");
  }
  await db().insert(productImages).values({
    productId,
    url,
    alt: String(formData.get("alt") ?? ""),
    position: 0,
  });
  await auditLogSubject({ actor: admin.id, action: "IMAGE_UPDATE", targetType: "product", targetId: productId });
  revalidatePath(`/admin/products/${productId}`);
}
