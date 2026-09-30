import {
  productType,
  type DiscountType,
  type ProductType,
  type PromoCode,
  type PromoCodeScope,
  type PromoCodeTypeAmounts,
} from "@/db/schema";
import type { CheckoutTotals, ProductTypeTotals } from "./checkout-totals";
import { formatPHP } from "./money";
import { pluralLabelForType } from "./product-type";

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
  /** Both subtotals above split by product type, for an ORDER code with
   *  per-type amounts (typeAmounts) — see orderCodeBases. */
  byProductType: Record<ProductType, ProductTypeTotals>;
  /** The delivery fee *before* any code is applied (post free-shipping-
   *  threshold, which can already be 0). Only used to reject a DELIVERY-
   *  scope code up front when it would discount nothing — e.g. free
   *  shipping already kicked in — so it doesn't silently burn a
   *  maxRedemptions/onePerCustomer slot for zero benefit. */
  deliveryFeeCentavos: number;
  isFirstOrder: boolean;
  /** This specific customer has already redeemed this exact code before. */
  hasPriorRedemption: boolean;
  /** The customer trying to use the code. Required so a code limited to some customers cannot be used by anyone else. */
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
  "minSpendCentavos",
  "scope",
  "type",
  "amount",
  "typeAmounts",
] as const;
export type EligibilityCode = Pick<PromoCode, (typeof ELIGIBILITY_FIELDS)[number]> & {
  /** Customers allowed to use the code; empty means every customer. Loaded
   *  with withAllowedUsers (src/lib/promo-code-access.ts). */
  allowedUserIds: readonly string[];
};

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
  // First, so a customer who isn't on the list learns nothing else about the code.
  if (code.allowedUserIds.length > 0 && !code.allowedUserIds.includes(input.userId)) {
    return { ok: false, error: "This code can't be used on this account" };
  }
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
  // An ORDER code with per-type amounts counts only the types it discounts,
  // for its minimum spend as well as its discount.
  const bases = code.scope === "ORDER" ? orderCodeBases(code, input) : null;
  const only = bases?.types && bases.types.length > 0 ? joinTypes(bases.types) : null;
  const spend = bases ? bases.merchandiseCentavos : input.merchandiseSubtotalCentavos;
  if (only && spend <= 0) {
    return { ok: false, error: `This code is only for ${only}, and there are none in your bag` };
  }
  if (code.minSpendCentavos !== null && spend < code.minSpendCentavos) {
    return {
      ok: false,
      error: `Minimum spend of ${formatPHP(code.minSpendCentavos)}${only ? ` on ${only}` : ""} required for this code`,
    };
  }
  // A code that would discount nothing (e.g. a DELIVERY-scope code when
  // free shipping already applies, or an ORDER-scope code when every item
  // is already individually discounted) is rejected outright — otherwise
  // it'd silently consume a maxRedemptions/onePerCustomer slot for zero
  // benefit.
  const discount = bases
    ? bases.discountCentavos
    : calculatePromoCodeDiscount(code.type, code.amount, input.deliveryFeeCentavos);
  if (discount <= 0) {
    const everythingAlreadyDiscounted = bases !== null && bases.merchandiseCentavos > 0 && bases.eligibleCentavos === 0;
    return {
      ok: false,
      error:
        code.scope === "DELIVERY"
          ? "This code has nothing to discount — delivery is already free on this order"
          : everythingAlreadyDiscounted
            ? only
              ? `This code only applies to regular-price ${only}, and every one in your bag is already discounted`
              : "This code only applies to regular-price items, and everything in your bag is already discounted"
            : "This code wouldn't apply any discount to your order",
    };
  }
  return { ok: true };
}

type AmountCode = Pick<PromoCode, "type" | "amount" | "typeAmounts">;

/** True when the code sets a different amount for at least one product type. */
function hasTypeAmounts(typeAmounts: PromoCodeTypeAmounts | null): typeAmounts is PromoCodeTypeAmounts {
  return typeAmounts !== null && Object.keys(typeAmounts).length > 0;
}

/** What an ORDER code takes off one product type: its own amount if set, else the code's. */
export function amountForType(code: AmountCode, type: ProductType): number {
  return code.typeAmounts?.[type] ?? code.amount;
}

/** The code's amounts, largest first, each with the product types it covers (0s left out). */
function amountGroups(code: AmountCode): Array<{ amount: number; types: ProductType[] }> {
  const groups: Array<{ amount: number; types: ProductType[] }> = [];
  for (const type of productType) {
    const amount = amountForType(code, type);
    if (amount <= 0) continue;
    const group = groups.find((existing) => existing.amount === amount);
    if (group) group.types.push(type);
    else groups.push({ amount, types: [type] });
  }
  return groups.sort((a, b) => b.amount - a.amount);
}

function joinTypes(types: readonly ProductType[]): string {
  const labels = types.map(pluralLabelForType);
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * What an ORDER code is measured against and takes off. Without per-type
 * amounts: the whole bag for its minimum spend, and its amount off the
 * regular-price (no item discount) lines. With them, only the types it
 * discounts count toward the minimum, and each amount comes off its own
 * types' regular-price lines — so {amount 15, FULL_BOTTLE 0, PARTIAL 0} with
 * a ₱1,000 minimum needs ₱1,000 of decants and takes 15% off those decants.
 * A FIXED amount shared by several types comes off their lines together,
 * once, matching how the offer reads ("₱100 off decants and partials").
 */
export function orderCodeBases(
  code: AmountCode,
  totals: Pick<CheckoutTotals, "merchandiseSubtotalCentavos" | "orderDiscountEligibleSubtotalCentavos" | "byProductType">,
): { merchandiseCentavos: number; eligibleCentavos: number; discountCentavos: number; types: ProductType[] | null } {
  if (!hasTypeAmounts(code.typeAmounts)) {
    return {
      merchandiseCentavos: totals.merchandiseSubtotalCentavos,
      eligibleCentavos: totals.orderDiscountEligibleSubtotalCentavos,
      discountCentavos: calculatePromoCodeDiscount(code.type, code.amount, totals.orderDiscountEligibleSubtotalCentavos),
      types: null,
    };
  }
  const result = { merchandiseCentavos: 0, eligibleCentavos: 0, discountCentavos: 0, types: [] as ProductType[] };
  for (const group of amountGroups(code)) {
    let groupEligible = 0;
    for (const type of group.types) {
      result.merchandiseCentavos += totals.byProductType[type].merchandiseCentavos;
      groupEligible += totals.byProductType[type].eligibleCentavos;
      result.types.push(type);
    }
    result.eligibleCentavos += groupEligible;
    result.discountCentavos += calculatePromoCodeDiscount(code.type, group.amount, groupEligible);
  }
  // Every type discounted: the whole bag counts, so there's no "only for" to name.
  return result.types.length === productType.length ? { ...result, types: null } : result;
}

/**
 * Offer text: "15% off your order", "15% off decants", "15% off decants,
 * 5% off full bottles", "₱100 off delivery". Amounts are in the code's unit
 * (a percent, or centavos for FIXED).
 */
export function describePromoCodeAmounts(code: AmountCode & Pick<PromoCode, "scope">): string {
  const off = (amount: number) => (code.type === "PERCENTAGE" ? `${amount}%` : formatPHP(amount));
  if (code.scope === "DELIVERY") return `${off(code.amount)} off delivery`;
  const groups = amountGroups(code);
  if (groups.length === 0) return "Nothing off";
  if (groups.length === 1 && groups[0].types.length === productType.length) {
    return `${off(groups[0].amount)} off your order`;
  }
  return groups.map((group) => `${off(group.amount)} off ${joinTypes(group.types)}`).join(", ");
}

/** The product types an ORDER code with per-type amounts discounts, e.g.
 *  "decants and full bottles" — what its minimum spend counts. null when the
 *  code has one amount for every item (the whole bag counts). */
export function discountedTypesLabel(code: AmountCode & Pick<PromoCode, "scope">): string | null {
  if (code.scope !== "ORDER" || !hasTypeAmounts(code.typeAmounts)) return null;
  const types = amountGroups(code).flatMap((group) => group.types);
  return types.length === productType.length ? null : joinTypes(types) || null;
}

/**
 * Tidies per-type amounts before saving: drops any equal to the main amount
 * (they change nothing) and returns null when none are left. Only ORDER
 * codes keep them.
 */
export function normalizeTypeAmounts(
  scope: PromoCodeScope,
  amount: number,
  typeAmounts: PromoCodeTypeAmounts,
): PromoCodeTypeAmounts | null {
  if (scope !== "ORDER") return null;
  const kept: PromoCodeTypeAmounts = {};
  for (const type of productType) {
    const value = typeAmounts[type];
    if (value !== undefined && value !== amount) kept[type] = value;
  }
  return Object.keys(kept).length > 0 ? kept : null;
}

export function calculatePromoCodeDiscount(
  type: DiscountType,
  amount: number,
  baseCentavos: number,
): number {
  if (baseCentavos <= 0) return 0;
  // Capped at the base like a fixed amount, so a bad percentage (over 100)
  // can never take off more than the lines it applies to.
  if (type === "PERCENTAGE") return Math.min(baseCentavos, Math.round((baseCentavos * amount) / 100));
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
    "merchandiseSubtotalCentavos" | "orderDiscountEligibleSubtotalCentavos" | "byProductType" | "deliveryFeeCentavos"
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
        byProductType: input.preCodeTotals.byProductType,
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
      orderDiscountCentavos = orderCodeBases(code, input.preCodeTotals).discountCentavos;
    }
  }
  return { ok: true };
}
