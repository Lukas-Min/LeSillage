import type { CartTotals, PricedLine } from "./cart";
import { applyPromoCode } from "./promo-code";
import {
  isFreeShippingEligible,
  isTesterBonusEligible,
  type PromoConfig,
} from "./promo";
import type { DiscountType, FulfillmentMethod, PromoCodeScope } from "@/db/schema";

export type ActivePromoCode = { scope: PromoCodeScope; type: DiscountType; amount: number };

export interface CheckoutTotals {
  merchandiseSubtotalCentavos: number;
  discountCentavos: number;
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

/**
 * `promoCode` is the already-validated, currently-redeemable code (or
 * undefined/null for none) — callers re-validate eligibility themselves
 * (src/domain/promo-code.ts's checkPromoCodeEligibility) before ever passing
 * one in here; this function only computes the resulting numbers, it does
 * not decide whether the code is allowed.
 */
export function buildCartTotals(
  priced: CartTotals,
  promoConfig: PromoConfig,
  fulfillmentMethod: FulfillmentMethod,
  promoCode?: ActivePromoCode | null,
): CheckoutTotals {
  const lines = priced.lines.map((line: PricedLine) => ({
    productType: line.productType,
    discountedLineTotalCentavos: line.lineSubtotalCentavos,
  }));
  // An ORDER-scope code's discount depends only on the (already item-
  // discounted) merchandise subtotal, so it's the same for pickup and
  // delivery — computed once, up front.
  const orderDiscountCentavos =
    promoCode && promoCode.scope === "ORDER"
      ? applyPromoCode(promoCode, priced.merchandiseSubtotalCentavos, 0).orderDiscountCentavos
      : 0;
  const merchandiseAfterOrderDiscount = Math.max(
    0,
    priced.merchandiseSubtotalCentavos - orderDiscountCentavos,
  );
  if (fulfillmentMethod === "PICKUP") {
    return {
      merchandiseSubtotalCentavos: priced.merchandiseSubtotalCentavos,
      discountCentavos: priced.discountCentavos,
      orderDiscountCentavos,
      deliveryDiscountCentavos: 0,
      decantSubtotalCentavos: priced.decantSubtotalCentavos,
      deliveryFeeCentavos: 0,
      totalCentavos: merchandiseAfterOrderDiscount,
      freeShipping: true,
      testerBonusEligible: false,
      defaultDeliveryFeeCentavos: promoConfig.deliveryFeeCentavos,
    };
  }
  const freeShipping = isFreeShippingEligible(lines, promoConfig);
  const deliveryFeeBeforeCode = freeShipping ? 0 : promoConfig.deliveryFeeCentavos;
  const deliveryDiscountCentavos =
    promoCode && promoCode.scope === "DELIVERY"
      ? applyPromoCode(promoCode, 0, deliveryFeeBeforeCode).deliveryDiscountCentavos
      : 0;
  const deliveryFeeCentavos = deliveryFeeBeforeCode - deliveryDiscountCentavos;
  return {
    merchandiseSubtotalCentavos: priced.merchandiseSubtotalCentavos,
    discountCentavos: priced.discountCentavos,
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
