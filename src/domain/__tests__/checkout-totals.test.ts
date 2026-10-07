import { describe, expect, it } from "vitest";
import { buildCartTotals } from "../checkout-totals";
import type { CartTotals } from "../cart";
import type { PromoConfig } from "../promo";

function decantCart(decantCentavos: number): CartTotals {
  return {
    lines: [
      {
        skuId: "s1",
        productType: "DECANT",
        fulfillment: "ON_HAND",
        brand: "Velixir",
        quantity: 1,
        unitPriceCentavos: decantCentavos,
        discountedUnitCentavos: decantCentavos,
        lineSubtotalCentavos: decantCentavos,
        lineDiscountCentavos: 0,
      },
    ],
    merchandiseSubtotalCentavos: decantCentavos,
    discountCentavos: 0,
    deliveryFeeCentavos: 0,
    totalCentavos: decantCentavos,
    purchasedBrands: new Set(["Velixir"]),
    decantSubtotalCentavos: decantCentavos,
  };
}

const promo: PromoConfig = {
  decantThresholdCentavos: 200000,
  deliveryFeeCentavos: 12000,
  freeDeliveryEnabled: true,
  testerBonusEnabled: true,
  siteWideDiscount: { enabled: false, type: "PERCENTAGE", amount: 0, startsAt: null, endsAt: null },
};

describe("free tester on pickup and delivery", () => {
  it("is earned by a pickup order exactly as by a delivered one", () => {
    expect(buildCartTotals(decantCart(231500), promo, "PICKUP").testerBonusEligible).toBe(true);
    expect(buildCartTotals(decantCart(231500), promo, "DELIVERY").testerBonusEligible).toBe(true);
  });

  it("still needs the decant threshold, and the bonus switched on", () => {
    expect(buildCartTotals(decantCart(199900), promo, "PICKUP").testerBonusEligible).toBe(false);
    expect(buildCartTotals(decantCart(231500), { ...promo, testerBonusEnabled: false }, "PICKUP").testerBonusEligible).toBe(false);
  });
});
