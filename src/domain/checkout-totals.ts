import type { FulfillmentMethod } from "@/db/schema";
import type { CartTotals, PricedLine } from "./cart";
import {
  isFreeShippingEligible,
  isTesterBonusEligible,
  type PromoConfig,
} from "./promo";

export interface CheckoutTotals {
  merchandiseSubtotalCentavos: number;
  discountCentavos: number;
  decantSubtotalCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
  freeShipping: boolean;
  testerBonusEligible: boolean;
  defaultDeliveryFeeCentavos: number;
}

export function buildCartTotals(
  priced: CartTotals,
  promoConfig: PromoConfig,
  fulfillmentMethod: FulfillmentMethod,
): CheckoutTotals {
  const lines = priced.lines.map((line: PricedLine) => ({
    productType: line.productType,
    discountedLineTotalCentavos: line.lineSubtotalCentavos,
  }));
  if (fulfillmentMethod === "PICKUP") {
    return {
      merchandiseSubtotalCentavos: priced.merchandiseSubtotalCentavos,
      discountCentavos: priced.discountCentavos,
      decantSubtotalCentavos: priced.decantSubtotalCentavos,
      deliveryFeeCentavos: 0,
      totalCentavos: priced.merchandiseSubtotalCentavos,
      freeShipping: true,
      testerBonusEligible: false,
      defaultDeliveryFeeCentavos: promoConfig.deliveryFeeCentavos,
    };
  }
  const freeShipping = isFreeShippingEligible(lines, promoConfig);
  const deliveryFeeCentavos = freeShipping ? 0 : promoConfig.deliveryFeeCentavos;
  return {
    merchandiseSubtotalCentavos: priced.merchandiseSubtotalCentavos,
    discountCentavos: priced.discountCentavos,
    decantSubtotalCentavos: priced.decantSubtotalCentavos,
    deliveryFeeCentavos,
    totalCentavos: priced.merchandiseSubtotalCentavos + deliveryFeeCentavos,
    freeShipping,
    testerBonusEligible: isTesterBonusEligible(lines, promoConfig),
    defaultDeliveryFeeCentavos: promoConfig.deliveryFeeCentavos,
  };
}
