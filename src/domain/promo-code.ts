import type { DiscountType, PromoCode, PromoCodeScope } from "@/db/schema";
import type { CheckoutTotals } from "./checkout-totals";
import { formatPHP } from "./money";

export interface PromoCodeEligibilityInput {
  /** Merchandise subtotal after per-item (product/site-wide) discounts —
   *  never the original pre-discount price. For a DELIVERY-scope code this
   *  is still the merchandise subtotal (not the delivery fee), further
   *  reduced by the order's ORDER-scope code if it has one (checkPromoCodeSet)
   *  — minimum spend is always about how much the customer is buying, not
   *  how much shipping costs. */
  merchandiseSubtotalCentavos: number;
  /** The portion of merchandiseSubtotalCentavos not already covered by an
   *  item discount — see CheckoutTotals.orderDiscountEligibleSubtotalCentavos
   *  (src/domain/checkout-totals.ts), which computes this same number.
   *  Only used to reject an ORDER-scope code up front when it would
   *  discount nothing — e.g. every item in the cart is already
   *  individually discounted — so it doesn't silently burn a
   *  maxRedemptions/onePerCustomer slot for zero benefit. */
  orderDiscountEligibleSubtotalCentavos: number;
  /** The delivery fee *before* any code is applied (post free-shipping-
   *  threshold, which can already be 0). Only used to reject a DELIVERY-
   *  scope code up front when it would discount nothing — e.g. free
   *  shipping already kicked in — so it doesn't silently burn a
   *  maxRedemptions/onePerCustomer slot for zero benefit. */
  deliveryFeeCentavos: number;
  isFirstOrder: boolean;
  /** This specific customer has already redeemed this exact code before. */
  hasPriorRedemption: boolean;
  /** The customer trying to use the code. Required so a code locked to one account cannot be used by anyone else. */
  userId: string;
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
  "restrictedUserId",
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
  if (code.restrictedUserId && code.restrictedUserId !== input.userId) {
    return { ok: false, error: "This code can't be used on this account" };
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
  // free shipping already applies, or an ORDER-scope code when every item
  // is already individually discounted) is rejected outright — otherwise
  // it'd silently consume a maxRedemptions/onePerCustomer slot for zero
  // benefit.
  const base = code.scope === "ORDER" ? input.orderDiscountEligibleSubtotalCentavos : input.deliveryFeeCentavos;
  if (calculatePromoCodeDiscount(code.type, code.amount, base) <= 0) {
    const everythingAlreadyDiscounted =
      code.scope === "ORDER" && input.merchandiseSubtotalCentavos > 0 && input.orderDiscountEligibleSubtotalCentavos === 0;
    return {
      ok: false,
      error:
        code.scope === "DELIVERY"
          ? "This code has nothing to discount — delivery is already free on this order"
          : everythingAlreadyDiscounted
            ? "This code only applies to regular-price items, and everything in your bag is already discounted"
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
 * An order can carry one code of each scope (see PromoCodesByScope); since
 * they discount different bases, their discounts never overlap.
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

/** An order takes at most one code per scope: an ORDER code and a DELIVERY
 *  code discount different things, so they stack, but two codes of the same
 *  scope would discount the same thing twice. */
export interface PromoCodesByScope<T> {
  order: T | null;
  delivery: T | null;
}

export const MAX_PROMO_CODES_PER_ORDER = 2;

export function groupPromoCodesByScope<T extends { code: string; scope: PromoCodeScope }>(
  codes: readonly T[],
): { ok: true; codes: PromoCodesByScope<T> } | { ok: false; error: string } {
  const grouped: PromoCodesByScope<T> = { order: null, delivery: null };
  for (const code of codes) {
    const slot = code.scope === "ORDER" ? "order" : "delivery";
    const taken = grouped[slot];
    if (taken && taken.code !== code.code) {
      return { ok: false, error: `Only one ${slot} code per order — remove ${taken.code} to use ${code.code}` };
    }
    grouped[slot] = code;
  }
  return { ok: true, codes: grouped };
}

export interface PromoCodeSetInput {
  /** buildCartTotals with no code applied. */
  preCodeTotals: Pick<
    CheckoutTotals,
    "merchandiseSubtotalCentavos" | "orderDiscountEligibleSubtotalCentavos" | "deliveryFeeCentavos"
  >;
  isFirstOrder: boolean;
  userId: string;
  /** Which of these codes this customer has already redeemed on an earlier order. */
  previouslyRedeemedCodeIds: ReadonlySet<string>;
}

/**
 * Checks an order's codes in pipeline order: the ORDER code first, then the
 * DELIVERY code, whose minimum spend is measured after the ORDER code's
 * discount (see minSpendCentavos in src/db/schema.ts). Adding an order code
 * can therefore push an already-applied delivery code under its minimum, so
 * the failing code is named in the error whenever there are two.
 */
export function checkPromoCodeSet(
  codes: PromoCodesByScope<EligibilityCode & Pick<PromoCode, "id" | "code">>,
  input: PromoCodeSetInput,
  now: Date = new Date(),
): { ok: true } | { ok: false; code: string; error: string } {
  const both = codes.order !== null && codes.delivery !== null;
  let orderDiscountCentavos = 0;
  for (const code of [codes.order, codes.delivery]) {
    if (!code) continue;
    const eligibility = checkPromoCodeEligibility(
      code,
      {
        merchandiseSubtotalCentavos: input.preCodeTotals.merchandiseSubtotalCentavos - orderDiscountCentavos,
        orderDiscountEligibleSubtotalCentavos: input.preCodeTotals.orderDiscountEligibleSubtotalCentavos,
        deliveryFeeCentavos: input.preCodeTotals.deliveryFeeCentavos,
        isFirstOrder: input.isFirstOrder,
        hasPriorRedemption: input.previouslyRedeemedCodeIds.has(code.id),
        userId: input.userId,
      },
      now,
    );
    if (!eligibility.ok) {
      return { ok: false, code: code.code, error: both ? `${code.code}: ${eligibility.error}` : eligibility.error };
    }
    if (code.scope === "ORDER") {
      orderDiscountCentavos = calculatePromoCodeDiscount(
        code.type,
        code.amount,
        input.preCodeTotals.orderDiscountEligibleSubtotalCentavos,
      );
    }
  }
  return { ok: true };
}
