"use server";

import { and, count, eq, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders, promoCodes, promoCodeRedemptions } from "@/db/schema";
import {
  calculatePromoCodeDiscount,
  checkPromoCodeSet,
  groupPromoCodesByScope,
  MAX_PROMO_CODES_PER_ORDER,
  orderCodeBases,
} from "@/domain/promo-code";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { loadCartViewForBothMethods, loadDirectItemViewForBothMethods, resolveActiveCart } from "@/lib/cart";
import { withAllowedUsers } from "@/lib/promo-code-access";
import { allocatePromoToLines } from "@/domain/order-summary";

export interface PromoCodePreview {
  code: string;
  scope: "ORDER" | "DELIVERY";
  orderDiscountCentavos: number;
  deliveryDiscountCentavos: number;
  /** An ORDER code's discount split across the order's lines, by skuId, so
   *  checkout can show each item's price after the code. Same split as the
   *  admin order page (allocatePromoToLines): lines with their own item
   *  discount get none, and a per-type code weighs each type by its amount. */
  lineShares?: Record<string, number>;
}

/**
 * Expected rejections ("Invalid promo code", "Minimum spend of ₱… required")
 * travel back as `{ ok: false, error }` instead of being thrown: Next.js
 * replaces the message of any error thrown out of a Server Action in
 * production with generic React #441 boilerplate, so a thrown rejection
 * would reach the checkout form unreadable. Only unexpected failures (DB
 * down) still throw.
 */
export type PromoCodePreviewResult =
  | { ok: true; previews: PromoCodePreview[] }
  // `code` names which of the submitted codes failed, when it's one specific code.
  | { ok: false; error: string; code?: string };

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
 *
 * `rawCodes` is every code the customer wants on the order — the ones
 * already applied plus the one being added — checked together through the
 * same checkPromoCodeSet the order itself uses, because adding an order
 * code can push an applied delivery code under its minimum spend.
 */
export async function previewPromoCodes(
  rawCodes: readonly string[],
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

  const normalizedCodes = [...new Set(rawCodes.map((code) => code.trim().toUpperCase()).filter(Boolean))];
  if (normalizedCodes.length === 0) return { ok: false, error: "Enter a code" };
  if (normalizedCodes.length > MAX_PROMO_CODES_PER_ORDER) {
    return { ok: false, error: "Use at most one order code and one delivery code" };
  }

  const parsedDirectItem = directItem ? directItemSchema.safeParse(directItem) : null;
  if (parsedDirectItem && !parsedDirectItem.success) {
    return { ok: false, error: "This item is no longer available" };
  }

  const client = db();
  const codeRows = await withAllowedUsers(
    await client.select().from(promoCodes).where(inArray(promoCodes.code, normalizedCodes)),
  );
  const missing = normalizedCodes.find((code) => !codeRows.some((row) => row.code === code));
  if (missing) return { ok: false, error: `Invalid promo code: ${missing}`, code: missing };
  // Grouped in the order the customer entered them (applied codes first, the
  // new one last), so a same-scope clash names the applied one to remove.
  const grouped = groupPromoCodesByScope(
    normalizedCodes.map((code) => codeRows.find((row) => row.code === code)!),
  );
  if (!grouped.ok) return { ok: false, error: grouped.error };

  const view = parsedDirectItem
    ? await loadDirectItemViewForBothMethods(parsedDirectItem.data.skuId, parsedDirectItem.data.quantity)
    : await resolveActiveCart().then(({ cart }) => loadCartViewForBothMethods(cart.id));
  const totals = fulfillmentMethod === "PICKUP" ? view.pickupTotals : view.deliveryTotals;
  if (totals.merchandiseSubtotalCentavos <= 0) {
    return { ok: false, error: parsedDirectItem ? "This item is no longer available" : "Your bag is empty" };
  }

  const [priorOrderCount, priorRedemptions] = await Promise.all([
    client
      .select({ value: count() })
      .from(orders)
      .where(and(eq(orders.userId, session.user.id), notInArray(orders.status, ["REJECTED", "CANCELLED"]))),
    client
      .select({ promoCodeId: promoCodeRedemptions.promoCodeId })
      .from(promoCodeRedemptions)
      .where(
        and(
          inArray(
            promoCodeRedemptions.promoCodeId,
            codeRows.map((row) => row.id),
          ),
          eq(promoCodeRedemptions.userId, session.user.id),
        ),
      ),
  ]);

  const eligibility = checkPromoCodeSet(grouped.codes, {
    preCodeTotals: totals,
    isFirstOrder: Number(priorOrderCount[0]?.value ?? 0) === 0,
    userId: session.user.id,
    previouslyRedeemedCodeIds: new Set(priorRedemptions.map((row) => row.promoCodeId)),
  });
  if (!eligibility.ok) return { ok: false, error: eligibility.error, code: eligibility.code };

  // Same bases buildCartTotals discounts from: an ORDER code against the
  // regular-price lines (per product type, if it has per-type amounts), a
  // DELIVERY code against the fee before any code.
  const previews: PromoCodePreview[] = [];
  const { order, delivery } = grouped.codes;
  if (order) {
    const orderDiscountCentavos = orderCodeBases(order, totals).discountCentavos;
    const available = view.items.filter((item) => item.available);
    const shares = allocatePromoToLines(
      available.map((item) => ({
        id: item.skuId,
        lineTotalCentavos: item.lineTotalCentavos,
        itemDiscountCentavos: Math.max(0, item.originalUnitCentavos * item.quantity - item.lineTotalCentavos),
        productType: item.productType,
      })),
      orderDiscountCentavos,
      order,
    );
    previews.push({
      code: order.code,
      scope: "ORDER",
      orderDiscountCentavos,
      deliveryDiscountCentavos: 0,
      lineShares: Object.fromEntries(shares),
    });
  }
  if (delivery) {
    previews.push({
      code: delivery.code,
      scope: "DELIVERY",
      orderDiscountCentavos: 0,
      deliveryDiscountCentavos: calculatePromoCodeDiscount(delivery.type, delivery.amount, totals.deliveryFeeCentavos),
    });
  }
  return { ok: true, previews };
}
