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
import { computeRetailPrice } from "@/domain/pricing";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import { uploadPublicImage } from "@/lib/blob";
import { clampRemainingMl } from "@/domain/decant";

async function limitAdmin(adminId: string, key: string) {
  const decision = await rateLimit({
    bucket: "ACCOUNT",
    key: await getRequestKey(key, adminId),
    limit: 40,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");
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
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  sourceMl: z.coerce.number().int().min(0).optional(),
  remainingMl: z.coerce.number().int().min(0).optional(),
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
    description: formData.get("description") || undefined,
    notes: formData.get("notes") || undefined,
    sourceMl: formData.get("sourceMl") || undefined,
    remainingMl: formData.get("remainingMl") || undefined,
    isActive: formData.get("isActive") === "on",
  });
  const values = {
    type: parsed.type as ProductType,
    fragranceCategory: parsed.fragranceCategory as FragranceCategory,
    concentration: (parsed.concentration as Concentration | undefined) ?? null,
    name: parsed.name,
    brand: parsed.brand,
    family: parsed.family ?? null,
    description: parsed.description ?? null,
    notes: parsed.notes ?? null,
    sourceMl: parsed.type === "DECANT" ? parsed.sourceMl ?? null : null,
    remainingMl: parsed.type === "DECANT" ? clampRemainingMl(parsed.remainingMl ?? 0) : null,
    isActive: parsed.isActive,
    updatedAt: new Date(),
  };
  if (parsed.productId) {
    await db().update(products).set(values).where(eq(products.id, parsed.productId));
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
}

const skuSchema = z.object({
  skuId: z.string().optional(),
  productId: z.string().min(1),
  sku: z.string().min(2).max(80),
  label: z.string().min(1).max(120),
  sizeMl: z.coerce.number().int().min(0).optional(),
  condition: z.enum(["BNIB", "SEALED", "FEW_SPRAYS_MISSING", "PARTIAL_ML"]),
  provenance: z.enum(["RETAIL", "TESTER"]),
  packaging: z.enum(["WITH_BOX", "BOTTLE_ONLY"]),
  costPrice: z.coerce.number().int().min(0),
  pricingMode: z.enum(["PERCENTAGE", "FIXED", "DIRECT"]),
  pricingInput: z.coerce.number().min(0),
  fulfillment: z.enum(["PRE_ORDER", "ON_HAND"]),
  stock: z.coerce.number().int().min(0),
  isTester: z.boolean(),
  isActive: z.boolean(),
});

export async function upsertSku(formData: FormData) {
  const admin = await requireAdmin();
  await limitAdmin(admin.id, "sku-upsert");
  const parsed = skuSchema.parse({
    skuId: formData.get("skuId") || undefined,
    productId: formData.get("productId"),
    sku: formData.get("sku"),
    label: formData.get("label"),
    sizeMl: formData.get("sizeMl") || undefined,
    condition: formData.get("condition"),
    provenance: formData.get("provenance"),
    packaging: formData.get("packaging"),
    costPrice: formData.get("costPrice"),
    pricingMode: formData.get("pricingMode"),
    pricingInput: formData.get("pricingInput"),
    fulfillment: formData.get("fulfillment"),
    stock: formData.get("stock"),
    isTester: formData.get("isTester") === "on",
    isActive: formData.get("isActive") === "on",
  });
  const retailPrice = computeRetailPrice({
    costPriceCentavos: parsed.costPrice,
    mode: parsed.pricingMode as PricingMode,
    input: parsed.pricingInput,
  });
  const values = {
    productId: parsed.productId,
    sku: parsed.sku,
    label: parsed.label,
    sizeMl: parsed.sizeMl ?? null,
    condition: parsed.condition as Condition,
    provenance: parsed.provenance as Provenance,
    packaging: parsed.packaging as Packaging,
    costPrice: parsed.costPrice,
    pricingMode: parsed.pricingMode as PricingMode,
    pricingInput: parsed.pricingInput,
    retailPrice,
    fulfillment: parsed.fulfillment as Fulfillment,
    stock: parsed.stock,
    isTester: parsed.isTester,
    isActive: parsed.isActive,
    updatedAt: new Date(),
  };
  if (parsed.skuId) {
    await db().update(skus).set(values).where(eq(skus.id, parsed.skuId));
    await auditLogSubject({
      actor: admin.id,
      action: "SKU_UPDATE",
      targetType: "sku",
      targetId: parsed.skuId,
    });
  } else {
    const inserted = await db().insert(skus).values(values).returning();
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
  const amount = z.coerce.number().int().min(1).parse(formData.get("amount"));
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

export async function uploadProductImage(formData: FormData) {
  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Image required");
  const uploaded = await uploadPublicImage(`products/${productId}`, {
    name: file.name,
    type: file.type,
    bytes: await file.arrayBuffer(),
  });
  await db().insert(productImages).values({
    productId,
    url: uploaded.url,
    alt: String(formData.get("alt") ?? ""),
    position: 0,
  });
  await auditLogSubject({ actor: admin.id, action: "IMAGE_UPDATE", targetType: "product", targetId: productId });
  revalidatePath(`/admin/products/${productId}`);
}
