"use server";

import { and, count, eq, notInArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders, promoCodes, promoCodeRedemptions } from "@/db/schema";
import { calculatePromoCodeDiscount, checkPromoCodeEligibility } from "@/domain/promo-code";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { loadCartViewForBothMethods, resolveActiveCart } from "@/lib/cart";

export interface PromoCodePreview {
  code: string;
  scope: "ORDER" | "DELIVERY";
  orderDiscountCentavos: number;
  deliveryDiscountCentavos: number;
}

/**
 * Checkout's "Apply" button calls this to show the customer what a code is
 * worth before they submit — it does NOT redeem anything. The authoritative
 * check happens again, transactionally, inside createOrderFromCart
 * (src/lib/orders.ts) at order-creation time, so a code that stops
 * qualifying between preview and submit (redemption cap hit by someone
 * else, code deactivated) is still caught there. Never trust this preview's
 * numbers for the actual charge.
 */
export async function previewPromoCode(
  rawCode: string,
  fulfillmentMethod: "DELIVERY" | "PICKUP",
): Promise<PromoCodePreview> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in to use a promo code");
  const decision = await rateLimit({
    bucket: "CHECKOUT",
    key: await getRequestKey("promo-preview", session.user.id),
    limit: 20,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many requests. Please slow down.");

  const normalizedCode = rawCode.trim().toUpperCase();
  if (!normalizedCode) throw new Error("Enter a code");

  const client = db();
  const [codeRow] = await client.select().from(promoCodes).where(eq(promoCodes.code, normalizedCode));
  if (!codeRow) throw new Error("Invalid promo code");

  const { cart } = await resolveActiveCart();
  const view = await loadCartViewForBothMethods(cart.id);
  const totals = fulfillmentMethod === "PICKUP" ? view.pickupTotals : view.deliveryTotals;
  if (totals.merchandiseSubtotalCentavos <= 0) throw new Error("Your bag is empty");

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
    deliveryFeeCentavos: totals.deliveryFeeCentavos,
    isFirstOrder: Number(priorOrderCount[0]?.value ?? 0) === 0,
    hasPriorRedemption: priorRedemption.length > 0,
  });
  if (!eligibility.ok) throw new Error(eligibility.error);

  const baseCentavos = codeRow.scope === "ORDER" ? totals.merchandiseSubtotalCentavos : totals.deliveryFeeCentavos;
  const discountCentavos = calculatePromoCodeDiscount(codeRow.type, codeRow.amount, baseCentavos);

  return {
    code: codeRow.code,
    scope: codeRow.scope,
    orderDiscountCentavos: codeRow.scope === "ORDER" ? discountCentavos : 0,
    deliveryDiscountCentavos: codeRow.scope === "DELIVERY" ? discountCentavos : 0,
  };
}
