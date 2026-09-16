"use server";

import { revalidatePath } from "next/cache";
import { signIn } from "@/auth";
import { db } from "@/db/client";
import { promoSettings, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { transitionOrderStatus } from "@/lib/orders";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";
import { toCentavos } from "@/domain/money";

// decantThresholdCentavos/deliveryFeeCentavos/siteWideDiscountAmount (when FIXED)
// are entered in pesos here (decimals allowed for centavos) and converted below
// via toCentavos — the field names keep their DB-column spelling, not their unit.
const promoSchema = z.object({
  decantThresholdCentavos: z.coerce.number().min(0).max(1_000_000),
  deliveryFeeCentavos: z.coerce.number().min(0).max(1_000_000),
  freeDeliveryEnabled: z.coerce.boolean(),
  testerBonusEnabled: z.coerce.boolean(),
  decantPreOrderThresholdMl: z.coerce.number().int().min(0).max(1000),
  siteWideDiscountEnabled: z.coerce.boolean(),
  siteWideDiscountType: z.enum(["PERCENTAGE", "FIXED"]),
  siteWideDiscountAmount: z.coerce.number().min(0),
});

export async function adminOAuthSignIn(provider: "google" | "facebook", returnTo?: string) {
  const decision = await rateLimit({
    bucket: "OAUTH",
    key: await getRequestKey("oauth-signin"),
    limit: 10,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many sign-in attempts. Please slow down.");
  await signIn(provider, { redirectTo: returnTo ?? "/account" });
}

export async function updatePromoSettings(formData: FormData) {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("promo-update", admin.id),
    limit: 30,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");
  const parsed = promoSchema.parse({
    decantThresholdCentavos: formData.get("decantThresholdCentavos"),
    deliveryFeeCentavos: formData.get("deliveryFeeCentavos"),
    freeDeliveryEnabled: formData.get("freeDeliveryEnabled") === "on",
    testerBonusEnabled: formData.get("testerBonusEnabled") === "on",
    decantPreOrderThresholdMl: formData.get("decantPreOrderThresholdMl"),
    siteWideDiscountEnabled: formData.get("siteWideDiscountEnabled") === "on",
    siteWideDiscountType: formData.get("siteWideDiscountType"),
    siteWideDiscountAmount: formData.get("siteWideDiscountAmount") || 0,
  });
  if (parsed.siteWideDiscountType === "PERCENTAGE" && parsed.siteWideDiscountAmount > 100) {
    throw new Error("Percentage discounts can't exceed 100%");
  }
  const values = {
    decantThresholdCentavos: toCentavos(parsed.decantThresholdCentavos),
    deliveryFeeCentavos: toCentavos(parsed.deliveryFeeCentavos),
    freeDeliveryEnabled: parsed.freeDeliveryEnabled,
    testerBonusEnabled: parsed.testerBonusEnabled,
    decantPreOrderThresholdMl: parsed.decantPreOrderThresholdMl,
    siteWideDiscountEnabled: parsed.siteWideDiscountEnabled,
    siteWideDiscountType: parsed.siteWideDiscountType,
    siteWideDiscountAmount:
      parsed.siteWideDiscountType === "FIXED" ? toCentavos(parsed.siteWideDiscountAmount) : Math.round(parsed.siteWideDiscountAmount),
  };
  await db()
    .update(promoSettings)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(promoSettings.id, "singleton"));
  await auditLogSubject({
    actor: admin.id,
    action: "PROMO_UPDATE",
    targetType: "promo_setting",
    targetId: "singleton",
    metadata: values,
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/promo");
}

const transitionSchema = z.object({
  orderId: z.string().min(1),
  next: z.enum([
    "RECEIPT_SUBMITTED",
    "CONFIRMED",
    "SHIPPED",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
  ]),
  reason: z.string().max(280).optional(),
});

// Expected rejections (a stale/raced order state, a missing reason) come
// back as `{ ok: false, error }` rather than being thrown — Next.js redacts
// a thrown Server Action error's message in production, turning e.g.
// "Invalid order transition" into React #441 boilerplate. Same pattern as
// CheckoutResult in src/actions/order-actions.ts.
export type OrderActionResult = { ok: true } | { ok: false; error: string };

export async function adminTransitionOrder(formData: FormData): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("order-transition", admin.id),
    limit: 60,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Too many requests. Please slow down." };
  const parsed = transitionSchema.parse({
    orderId: formData.get("orderId"),
    next: formData.get("next"),
    reason: formData.get("reason") ?? undefined,
  });
  try {
    await transitionOrderStatus({
      orderId: parsed.orderId,
      next: parsed.next,
      reason: parsed.reason ?? null,
    });
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function adminMarkShipped(formData: FormData): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const orderId = formData.get("orderId");
  if (typeof orderId !== "string") return { ok: false, error: "Order id required" };
  try {
    await transitionOrderStatus({ orderId, next: "SHIPPED" });
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/admin/orders");
  auditLogSubject({
    actor: admin.id,
    action: "ORDER_STATUS",
    targetType: "order",
    targetId: orderId,
    metadata: { to: "SHIPPED" },
  });
  return { ok: true };
}

export async function adminConfirmReceipt(formData: FormData): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  const orderId = formData.get("orderId");
  if (typeof orderId !== "string") return { ok: false, error: "Order id required" };
  const order = (await db().select().from(orders).where(eq(orders.id, orderId)))[0];
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status !== "RECEIPT_SUBMITTED") return { ok: true };
  const next = "CONFIRMED";
  try {
    await transitionOrderStatus({ orderId, next });
  } catch (error) {
    if (error instanceof Error) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath("/admin/orders");
  auditLogSubject({
    actor: admin.id,
    action: "ORDER_STATUS",
    targetType: "order",
    targetId: orderId,
    metadata: { to: next },
  });
  return { ok: true };
}
