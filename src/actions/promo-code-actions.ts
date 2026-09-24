"use server";

import { and, count, eq, notInArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders, promoCodes, promoCodeRedemptions } from "@/db/schema";
import { calculatePromoCodeDiscount, checkPromoCodeEligibility } from "@/domain/promo-code";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { loadCartViewForBothMethods, loadDirectItemViewForBothMethods, resolveActiveCart } from "@/lib/cart";

export interface PromoCodePreview {
  code: string;
  scope: "ORDER" | "DELIVERY";
  orderDiscountCentavos: number;
  deliveryDiscountCentavos: number;
}

/**
 * Expected rejections ("Invalid promo code", "Minimum spend of ₱… required")
 * travel back as `{ ok: false, error }` instead of being thrown: Next.js
 * replaces the message of any error thrown out of a Server Action in
 * production with generic React #441 boilerplate, so a thrown rejection
 * would reach the checkout form unreadable. Only unexpected failures (DB
 * down) still throw.
 */
export type PromoCodePreviewResult = { ok: true; preview: PromoCodePreview } | { ok: false; error: string };

// Same shape createCheckoutOrder accepts for its Buy Now item, so the
// preview is priced against exactly what the order will be.
const directItemSchema = z.object({ skuId: z.string().min(1), quantity: z.number().int().min(1) });

/**
 * Checkout's "Apply" button calls this to show the customer what a code is
 * worth before they submit — it does NOT redeem anything. The authoritative
 * check happens again, transactionally, inside createOrderFromCart
 * (src/lib/orders.ts) at order-creation time, so a code that stops
 * qualifying between preview and submit (redemption cap hit by someone
 * else, code deactivated) is still caught there. Never trust this preview's
 * numbers for the actual charge.
 *
 * `directItem` is the Buy Now case: the preview prices that one item, never
 * the customer's (possibly empty, possibly unrelated) cart — mirroring the
 * `directItems` branch of createOrderFromCart.
 */
export async function previewPromoCode(
  rawCode: string,
  fulfillmentMethod: "DELIVERY" | "PICKUP",
  directItem: { skuId: string; quantity: number } | null = null,
): Promise<PromoCodePreviewResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Please sign in to use a promo code" };
  const decision = await rateLimit({
    bucket: "CHECKOUT",
    key: await getRequestKey("promo-preview", session.user.id),
    limit: 20,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Too many requests. Please slow down." };

  const normalizedCode = rawCode.trim().toUpperCase();
  if (!normalizedCode) return { ok: false, error: "Enter a code" };

  const parsedDirectItem = directItem ? directItemSchema.safeParse(directItem) : null;
  if (parsedDirectItem && !parsedDirectItem.success) {
    return { ok: false, error: "This item is no longer available" };
  }

  const client = db();
  const [codeRow] = await client.select().from(promoCodes).where(eq(promoCodes.code, normalizedCode));
  if (!codeRow) return { ok: false, error: "Invalid promo code" };

  const view = parsedDirectItem
    ? await loadDirectItemViewForBothMethods(parsedDirectItem.data.skuId, parsedDirectItem.data.quantity)
    : await resolveActiveCart().then(({ cart }) => loadCartViewForBothMethods(cart.id));
  const totals = fulfillmentMethod === "PICKUP" ? view.pickupTotals : view.deliveryTotals;
  if (totals.merchandiseSubtotalCentavos <= 0) {
    return { ok: false, error: parsedDirectItem ? "This item is no longer available" : "Your bag is empty" };
  }

  const [priorOrderCount, priorRedemption] = await Promise.all([
    client
      .select({ value: count() })
      .from(orders)
      .where(and(eq(orders.userId, session.user.id), notInArray(orders.status, ["REJECTED", "CANCELLED"]))),
    client
      .select({ id: promoCodeRedemptions.id })
      .from(promoCodeRedemptions)
      .where(
        and(eq(promoCodeRedemptions.promoCodeId, codeRow.id), eq(promoCodeRedemptions.userId, session.user.id)),
      )
      .limit(1),
  ]);

  const eligibility = checkPromoCodeEligibility(codeRow, {
    merchandiseSubtotalCentavos: totals.merchandiseSubtotalCentavos,
    orderDiscountEligibleSubtotalCentavos: totals.orderDiscountEligibleSubtotalCentavos,
    deliveryFeeCentavos: totals.deliveryFeeCentavos,
    isFirstOrder: Number(priorOrderCount[0]?.value ?? 0) === 0,
    hasPriorRedemption: priorRedemption.length > 0,
  });
  if (!eligibility.ok) return { ok: false, error: eligibility.error };

  const baseCentavos = codeRow.scope === "ORDER" ? totals.orderDiscountEligibleSubtotalCentavos : totals.deliveryFeeCentavos;
  const discountCentavos = calculatePromoCodeDiscount(codeRow.type, codeRow.amount, baseCentavos);

  return {
    ok: true,
    preview: {
      code: codeRow.code,
      scope: codeRow.scope,
      orderDiscountCentavos: codeRow.scope === "ORDER" ? discountCentavos : 0,
      deliveryDiscountCentavos: codeRow.scope === "DELIVERY" ? discountCentavos : 0,
    },
  };
}
