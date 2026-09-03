import type { DiscountType, PromoCode } from "@/db/schema";
import { formatPHP } from "./money";

export interface PromoCodeEligibilityInput {
  /** Merchandise subtotal after per-item (product/site-wide) discounts —
   *  never the original pre-discount price. For a DELIVERY-scope code this
   *  is still the merchandise subtotal (not the delivery fee) — minimum
   *  spend is always about how much the customer is buying, not how much
   *  shipping costs. */
  merchandiseSubtotalCentavos: number;
  /** The delivery fee *before* any code is applied (post free-shipping-
   *  threshold, which can already be 0). Only used to reject a DELIVERY-
   *  scope code up front when it would discount nothing — e.g. free
   *  shipping already kicked in — so it doesn't silently burn a
   *  maxRedemptions/onePerCustomer slot for zero benefit. */
  deliveryFeeCentavos: number;
  isFirstOrder: boolean;
  /** This specific customer has already redeemed this exact code before. */
  hasPriorRedemption: boolean;
}

export type PromoCodeEligibility = { ok: true } | { ok: false; error: string };

const ELIGIBILITY_FIELDS = [
  "isActive",
  "startsAt",
  "endsAt",
  "firstOrderOnly",
  "maxRedemptions",
  "redemptionCount",
  "onePerCustomer",
  "minSpendCentavos",
  "scope",
  "type",
  "amount",
] as const;
type EligibilityCode = Pick<PromoCode, (typeof ELIGIBILITY_FIELDS)[number]>;

/**
 * Pure eligibility check — no DB access. Callers re-run this at order
 * creation time against freshly-loaded state (never trust a client-supplied
 * "this code is valid" flag) inside the same transaction that records the
 * redemption, so a maxRedemptions/onePerCustomer race can't slip through.
 */
export function checkPromoCodeEligibility(
  code: EligibilityCode,
  input: PromoCodeEligibilityInput,
  now: Date = new Date(),
): PromoCodeEligibility {
  if (!code.isActive) return { ok: false, error: "This code is no longer active" };
  if (code.startsAt && code.startsAt > now) return { ok: false, error: "This code isn't active yet" };
  if (code.endsAt && code.endsAt < now) return { ok: false, error: "This code has expired" };
  if (code.firstOrderOnly && !input.isFirstOrder) {
    return { ok: false, error: "This code is only for a customer's first order" };
  }
  if (code.onePerCustomer && input.hasPriorRedemption) {
    return { ok: false, error: "You've already used this code" };
  }
  if (code.maxRedemptions !== null && code.redemptionCount >= code.maxRedemptions) {
    return { ok: false, error: "This code has reached its redemption limit" };
  }
  if (code.minSpendCentavos !== null && input.merchandiseSubtotalCentavos < code.minSpendCentavos) {
    return { ok: false, error: `Minimum spend of ${formatPHP(code.minSpendCentavos)} required for this code` };
  }
  // A code that would discount nothing (e.g. a DELIVERY-scope code when
  // free shipping already applies) is rejected outright — otherwise it'd
  // silently consume a maxRedemptions/onePerCustomer slot for zero benefit.
  const base = code.scope === "ORDER" ? input.merchandiseSubtotalCentavos : input.deliveryFeeCentavos;
  if (calculatePromoCodeDiscount(code.type, code.amount, base) <= 0) {
    return {
      ok: false,
      error:
        code.scope === "DELIVERY"
          ? "This code has nothing to discount — delivery is already free on this order"
          : "This code wouldn't apply any discount to your order",
    };
  }
  return { ok: true };
}

export function calculatePromoCodeDiscount(
  type: DiscountType,
  amount: number,
  baseCentavos: number,
): number {
  if (baseCentavos <= 0) return 0;
  if (type === "PERCENTAGE") return Math.round((baseCentavos * amount) / 100);
  return Math.min(baseCentavos, amount);
}

export interface PromoCodeApplication {
  orderDiscountCentavos: number;
  deliveryDiscountCentavos: number;
}

/**
 * Applies an already-validated code to the order. Scope decides which base
 * it discounts — ORDER against the (already item-discounted) merchandise
 * subtotal, DELIVERY against the delivery fee — never both from one code.
 * Only one promo code can be active on an order at a time in v1 (a single
 * checkout code field), so this never has to reconcile two codes' discounts
 * against each other.
 */
export function applyPromoCode(
  code: Pick<PromoCode, "scope" | "type" | "amount">,
  merchandiseSubtotalCentavos: number,
  deliveryFeeCentavos: number,
): PromoCodeApplication {
  if (code.scope === "ORDER") {
    return {
      orderDiscountCentavos: calculatePromoCodeDiscount(code.type, code.amount, merchandiseSubtotalCentavos),
      deliveryDiscountCentavos: 0,
    };
  }
  return {
    orderDiscountCentavos: 0,
    deliveryDiscountCentavos: calculatePromoCodeDiscount(code.type, code.amount, deliveryFeeCentavos),
  };
}
