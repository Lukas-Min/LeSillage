"use server";

import { revalidatePath } from "next/cache";
import { signIn, signOut } from "@/auth";
import { db } from "@/db/client";
import { promoSettings, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { transitionOrderStatus } from "@/lib/orders";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { auditLogSubject } from "@/lib/audit";

const promoSchema = z.object({
  decantThresholdCentavos: z.coerce.number().int().min(0).max(1_000_000_00),
  deliveryFeeCentavos: z.coerce.number().int().min(0).max(1_000_000_00),
  freeDeliveryEnabled: z.coerce.boolean(),
  testerBonusEnabled: z.coerce.boolean(),
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

export async function adminSignOut() {
  await signOut({ redirectTo: "/sign-in" });
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
  });
  await db()
    .update(promoSettings)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(promoSettings.id, "singleton"));
  await auditLogSubject({
    actor: admin.id,
    action: "PROMO_UPDATE",
    targetType: "promo_setting",
    targetId: "singleton",
    metadata: parsed,
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

export async function adminTransitionOrder(formData: FormData) {
  const admin = await requireAdmin();
  const decision = await rateLimit({
    bucket: "PASSWORD",
    key: await getRequestKey("order-transition", admin.id),
    limit: 60,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");
  const parsed = transitionSchema.parse({
    orderId: formData.get("orderId"),
    next: formData.get("next"),
    reason: formData.get("reason") ?? undefined,
  });
  await transitionOrderStatus({
    orderId: parsed.orderId,
    next: parsed.next,
    reason: parsed.reason ?? null,
  });
  revalidatePath("/admin/orders");
}

export async function adminMarkShipped(formData: FormData) {
  const admin = await requireAdmin();
  const orderId = formData.get("orderId");
  if (typeof orderId !== "string") throw new Error("Order id required");
  await transitionOrderStatus({ orderId, next: "SHIPPED" });
  revalidatePath("/admin/orders");
  auditLogSubject({
    actor: admin.id,
    action: "ORDER_STATUS",
    targetType: "order",
    targetId: orderId,
    metadata: { to: "SHIPPED" },
  });
}

export async function adminConfirmReceipt(formData: FormData) {
  const admin = await requireAdmin();
  const orderId = formData.get("orderId");
  if (typeof orderId !== "string") throw new Error("Order id required");
  const order = (await db().select().from(orders).where(eq(orders.id, orderId)))[0];
  if (!order) throw new Error("Order not found");
  const next = order.status === "RECEIPT_SUBMITTED" ? "CONFIRMED" : order.status;
  await transitionOrderStatus({ orderId, next });
  revalidatePath("/admin/orders");
  auditLogSubject({
    actor: admin.id,
    action: "ORDER_STATUS",
    targetType: "order",
    targetId: orderId,
    metadata: { to: next },
  });
}
