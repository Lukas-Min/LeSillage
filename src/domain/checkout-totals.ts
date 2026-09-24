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
  // Lines that already have their own item discount (lineDiscountCentavos >
  // 0) don't contribute to the base an ORDER-scope code discounts from — see
  // orderDiscountEligibleSubtotalCentavos's own doc comment above.
  const orderDiscountEligibleSubtotalCentavos = priced.lines.reduce(
    (sum, line) => (line.lineDiscountCentavos === 0 ? sum + line.lineSubtotalCentavos : sum),
    0,
  );
  // An ORDER-scope code's discount depends only on that eligible subtotal,
  // so it's the same for pickup and delivery — computed once, up front.
  const orderDiscountCentavos =
    promoCode && promoCode.scope === "ORDER"
      ? applyPromoCode(promoCode, orderDiscountEligibleSubtotalCentavos, 0).orderDiscountCentavos
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
    orderDiscountEligibleSubtotalCentavos,
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
