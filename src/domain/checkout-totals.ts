import type { CartTotals, PricedLine } from "./cart";
import { applyPromoCode, orderCodeBases, type PromoCodesByScope } from "./promo-code";
import {
  isFreeShippingEligible,
  isTesterBonusEligible,
  type PromoConfig,
} from "./promo";
import type { DiscountType, FulfillmentMethod, ProductType, PromoCodeScope, PromoCodeTypeAmounts } from "@/db/schema";

export type ActivePromoCode = {
  scope: PromoCodeScope;
  type: DiscountType;
  amount: number;
  /** An ORDER code's per-product-type amounts; null for one amount on every item. */
  typeAmounts: PromoCodeTypeAmounts | null;
};

/** merchandiseSubtotalCentavos and orderDiscountEligibleSubtotalCentavos for one product type. */
export interface ProductTypeTotals {
  merchandiseCentavos: number;
  eligibleCentavos: number;
}

export interface CheckoutTotals {
  merchandiseSubtotalCentavos: number;
  discountCentavos: number;
  /** The portion of merchandiseSubtotalCentavos actually eligible for an
   *  ORDER-scope promo code's discount — lines that already carry their own
   *  item discount (a product's own productDiscounts row, or the site-wide
   *  discount) are excluded, so a code like WELCOME10 only ever discounts
   *  regular-price lines, never stacking on top of an item discount that's
   *  already applied. Exposed so callers validating a code before it's
   *  redeemed (checkPromoCodeEligibility's zero-benefit check, the checkout
   *  "Apply" preview) use the exact same base this function computes
   *  orderDiscountCentavos from below. */
  orderDiscountEligibleSubtotalCentavos: number;
  /** The two subtotals above split by product type, so an ORDER code limited
   *  with per-type amounts (PromoCode.typeAmounts) is measured and applied
   *  per type — see orderCodeBases in src/domain/promo-code.ts. */
  byProductType: Record<ProductType, ProductTypeTotals>;
  /** From a redeemed ORDER-scope promo code — kept separate from
   *  `discountCentavos` (item-level) so the checkout UI can show them as
   *  distinct line items, matching the three-discount-type model. */
  orderDiscountCentavos: number;
  /** From a redeemed DELIVERY-scope promo code. Applied on top of the
   *  automatic free-shipping-threshold discount (which already zeroes
   *  `deliveryFeeCentavos` below when eligible) — a code can't discount a
   *  fee that's already zero, `calculatePromoCodeDiscount` is a no-op then. */
  deliveryDiscountCentavos: number;
  decantSubtotalCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
  freeShipping: boolean;
  testerBonusEligible: boolean;
  defaultDeliveryFeeCentavos: number;
}

function totalsByProductType(lines: readonly PricedLine[]): Record<ProductType, ProductTypeTotals> {
  const totals: Record<ProductType, ProductTypeTotals> = {
    FULL_BOTTLE: { merchandiseCentavos: 0, eligibleCentavos: 0 },
    PARTIAL: { merchandiseCentavos: 0, eligibleCentavos: 0 },
    DECANT: { merchandiseCentavos: 0, eligibleCentavos: 0 },
  };
  for (const line of lines) {
    totals[line.productType].merchandiseCentavos += line.lineSubtotalCentavos;
    if (line.lineDiscountCentavos === 0) totals[line.productType].eligibleCentavos += line.lineSubtotalCentavos;
  }
  return totals;
}

/**
 * `promoCodes` are the already-validated, currently-redeemable codes, at
 * most one per scope (or undefined/null for none) — callers re-validate
 * eligibility themselves (src/domain/promo-code.ts's checkPromoCodeSet)
 * before ever passing them in here; this function only computes the
 * resulting numbers, it does not decide whether a code is allowed.
 */
export function buildCartTotals(
  priced: CartTotals,
  promoConfig: PromoConfig,
  fulfillmentMethod: FulfillmentMethod,
  promoCodes?: PromoCodesByScope<ActivePromoCode> | null,
): CheckoutTotals {
  const orderCode = promoCodes?.order ?? null;
  const deliveryCode = promoCodes?.delivery ?? null;
  const lines = priced.lines.map((line: PricedLine) => ({
    productType: line.productType,
    discountedLineTotalCentavos: line.lineSubtotalCentavos,
  }));
  // Lines that already have their own item discount (lineDiscountCentavos >
  // 0) don't contribute to the base an ORDER-scope code discounts from — see
  // orderDiscountEligibleSubtotalCentavos's own doc comment above.
  const orderDiscountEligibleSubtotalCentavos = priced.lines.reduce(
    (sum, line) => (line.lineDiscountCentavos === 0 ? sum + line.lineSubtotalCentavos : sum),
    0,
  );
  const byProductType = totalsByProductType(priced.lines);
  // An ORDER-scope code's discount depends only on that eligible subtotal
  // (split by product type, if the code has per-type amounts), so it's the
  // same for pickup and delivery — computed once, up front.
  const orderDiscountCentavos = orderCode
    ? orderCodeBases(orderCode, {
        merchandiseSubtotalCentavos: priced.merchandiseSubtotalCentavos,
        orderDiscountEligibleSubtotalCentavos,
        byProductType,
      }).discountCentavos
    : 0;
  const merchandiseAfterOrderDiscount = Math.max(
    0,
    priced.merchandiseSubtotalCentavos - orderDiscountCentavos,
  );
  if (fulfillmentMethod === "PICKUP") {
    return {
      merchandiseSubtotalCentavos: priced.merchandiseSubtotalCentavos,
      discountCentavos: priced.discountCentavos,
      orderDiscountEligibleSubtotalCentavos,
      byProductType,
      orderDiscountCentavos,
      deliveryDiscountCentavos: 0,
      decantSubtotalCentavos: priced.decantSubtotalCentavos,
      deliveryFeeCentavos: 0,
      totalCentavos: merchandiseAfterOrderDiscount,
      freeShipping: true,
      // The free tester comes with pickup orders too.
      testerBonusEligible: isTesterBonusEligible(lines, promoConfig),
      defaultDeliveryFeeCentavos: promoConfig.deliveryFeeCentavos,
    };
  }
  const freeShipping = isFreeShippingEligible(lines, promoConfig);
  const deliveryFeeBeforeCode = freeShipping ? 0 : promoConfig.deliveryFeeCentavos;
  const deliveryDiscountCentavos = deliveryCode
    ? applyPromoCode(deliveryCode, 0, deliveryFeeBeforeCode).deliveryDiscountCentavos
    : 0;
  const deliveryFeeCentavos = deliveryFeeBeforeCode - deliveryDiscountCentavos;
  return {
    merchandiseSubtotalCentavos: priced.merchandiseSubtotalCentavos,
    discountCentavos: priced.discountCentavos,
    orderDiscountEligibleSubtotalCentavos,
    byProductType,
    orderDiscountCentavos,
    deliveryDiscountCentavos,
    decantSubtotalCentavos: priced.decantSubtotalCentavos,
    deliveryFeeCentavos,
    totalCentavos: merchandiseAfterOrderDiscount + deliveryFeeCentavos,
    freeShipping,
    testerBonusEligible: isTesterBonusEligible(lines, promoConfig),
    defaultDeliveryFeeCentavos: promoConfig.deliveryFeeCentavos,
  };
}
