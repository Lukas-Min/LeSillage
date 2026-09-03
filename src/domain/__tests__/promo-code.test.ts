import { describe, expect, it } from "vitest";
import {
  applyPromoCode,
  calculatePromoCodeDiscount,
  checkPromoCodeEligibility,
  type PromoCodeEligibilityInput,
} from "../promo-code";
import { bestDiscount, applyDiscount, withSiteWideDiscount } from "../discount";
import { buildCartTotals } from "../checkout-totals";
import { priceCart, type CartSkuInput } from "../cart";
import type { PromoCode, Sku } from "@/db/schema";

function makeCode(overrides: Partial<PromoCode> = {}): PromoCode {
  return {
    id: "promo1",
    code: "TESTCODE",
    type: "PERCENTAGE",
    amount: 10,
    scope: "ORDER",
    minSpendCentavos: null,
    firstOrderOnly: false,
    maxRedemptions: null,
    redemptionCount: 0,
    onePerCustomer: false,
    startsAt: null,
    endsAt: null,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

const baseEligibility: PromoCodeEligibilityInput = {
  merchandiseSubtotalCentavos: 300000,
  deliveryFeeCentavos: 12000,
  isFirstOrder: false,
  hasPriorRedemption: false,
};

describe("checkPromoCodeEligibility", () => {
  it("rejects an inactive code", () => {
    expect(checkPromoCodeEligibility(makeCode({ isActive: false }), baseEligibility).ok).toBe(false);
  });

  it("rejects before startsAt and after endsAt", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    expect(
      checkPromoCodeEligibility(makeCode({ startsAt: new Date("2026-07-01") }), baseEligibility, now).ok,
    ).toBe(false);
    expect(
      checkPromoCodeEligibility(makeCode({ endsAt: new Date("2026-06-01") }), baseEligibility, now).ok,
    ).toBe(false);
    expect(
      checkPromoCodeEligibility(
        makeCode({ startsAt: new Date("2026-06-01"), endsAt: new Date("2026-07-01") }),
        baseEligibility,
        now,
      ).ok,
    ).toBe(true);
  });

  it("rejects a first-order-only code for a returning customer", () => {
    const code = makeCode({ firstOrderOnly: true });
    expect(checkPromoCodeEligibility(code, { ...baseEligibility, isFirstOrder: false }).ok).toBe(false);
    expect(checkPromoCodeEligibility(code, { ...baseEligibility, isFirstOrder: true }).ok).toBe(true);
  });

  it("rejects a onePerCustomer code the customer already redeemed", () => {
    const code = makeCode({ onePerCustomer: true });
    expect(checkPromoCodeEligibility(code, { ...baseEligibility, hasPriorRedemption: true }).ok).toBe(false);
    expect(checkPromoCodeEligibility(code, { ...baseEligibility, hasPriorRedemption: false }).ok).toBe(true);
  });

  it("rejects once maxRedemptions is reached", () => {
    const code = makeCode({ maxRedemptions: 5, redemptionCount: 5 });
    expect(checkPromoCodeEligibility(code, baseEligibility).ok).toBe(false);
    expect(checkPromoCodeEligibility(makeCode({ maxRedemptions: 5, redemptionCount: 4 }), baseEligibility).ok).toBe(
      true,
    );
  });

  it("evaluates minSpend against the given (already-discounted) subtotal, not any original price", () => {
    const code = makeCode({ minSpendCentavos: 200000 });
    expect(
      checkPromoCodeEligibility(code, { ...baseEligibility, merchandiseSubtotalCentavos: 199999 }).ok,
    ).toBe(false);
    expect(
      checkPromoCodeEligibility(code, { ...baseEligibility, merchandiseSubtotalCentavos: 200000 }).ok,
    ).toBe(true);
  });

  it("rejects a DELIVERY-scope code when the delivery fee is already 0 (e.g. free shipping already applies)", () => {
    const code = makeCode({ scope: "DELIVERY", type: "PERCENTAGE", amount: 100 });
    expect(checkPromoCodeEligibility(code, { ...baseEligibility, deliveryFeeCentavos: 0 }).ok).toBe(false);
    expect(checkPromoCodeEligibility(code, { ...baseEligibility, deliveryFeeCentavos: 12000 }).ok).toBe(true);
  });

  it("rejects an ORDER-scope code that would round down to a 0 discount", () => {
    // FIXED type with amount 0 always discounts 0, regardless of base.
    const code = makeCode({ scope: "ORDER", type: "FIXED", amount: 0 });
    expect(checkPromoCodeEligibility(code, baseEligibility).ok).toBe(false);
  });
});

describe("calculatePromoCodeDiscount", () => {
  it("computes a percentage discount", () => {
    expect(calculatePromoCodeDiscount("PERCENTAGE", 10, 100000)).toBe(10000);
  });

  it("caps a fixed discount at the base amount", () => {
    expect(calculatePromoCodeDiscount("FIXED", 50000, 30000)).toBe(30000);
  });

  it("returns 0 for a non-positive base", () => {
    expect(calculatePromoCodeDiscount("PERCENTAGE", 10, 0)).toBe(0);
  });
});

describe("applyPromoCode", () => {
  it("discounts the merchandise subtotal for an ORDER-scope code, leaving delivery untouched", () => {
    const result = applyPromoCode(makeCode({ scope: "ORDER", type: "PERCENTAGE", amount: 10 }), 100000, 12000);
    expect(result).toEqual({ orderDiscountCentavos: 10000, deliveryDiscountCentavos: 0 });
  });

  it("discounts the delivery fee for a DELIVERY-scope code, leaving the order subtotal untouched", () => {
    const result = applyPromoCode(
      makeCode({ scope: "DELIVERY", type: "PERCENTAGE", amount: 100 }),
      100000,
      12000,
    );
    expect(result).toEqual({ orderDiscountCentavos: 0, deliveryDiscountCentavos: 12000 });
  });
});

// --- Full pipeline: matches the store owner's own worked example ---
// "if all perfumes is discounted by 5%, then there's a promo code of 10%
// off with a minimum spend of 2000, the 2000 should be based on the
// discounted price, not the original price."
describe("full pipeline order-of-operations (site-wide item discount -> promo code)", () => {
  function makeSku(retailPrice: number): Sku {
    const now = new Date();
    return {
      id: "sku1",
      productId: "p1",
      sku: "X",
      label: "X",
      sizeMl: null,
      condition: "BNIB",
      provenance: "RETAIL",
      packaging: "WITH_BOX",
      costPrice: 0,
      retailPrice,
      pricingMode: "DIRECT",
      pricingInput: 0,
      fulfillment: "ON_HAND",
      stock: 5,
      isTester: false,
      testerFamily: null,
      testerBrand: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  it("rejects the min-spend when the original price clears it but the site-wide-discounted price doesn't", () => {
    // ₱2,100 original, 5% site-wide discount -> ₱1,995 — under the ₱2,000
    // minimum, even though the original price was over it.
    const discounts = withSiteWideDiscount([], "p1", { enabled: true, type: "PERCENTAGE", amount: 5 });
    const item: CartSkuInput = {
      sku: makeSku(210000),
      quantity: 1,
      productType: "DECANT",
      productBrand: "Maison Ivre",
      discounts,
    };
    const priced = priceCart([item], { deliveryFeeCentavos: 12000, freeShipping: false });
    expect(priced.merchandiseSubtotalCentavos).toBe(199500);

    const code = makeCode({ scope: "ORDER", type: "PERCENTAGE", amount: 10, minSpendCentavos: 200000 });
    const eligibility = checkPromoCodeEligibility(code, {
      merchandiseSubtotalCentavos: priced.merchandiseSubtotalCentavos,
      deliveryFeeCentavos: 12000,
      isFirstOrder: false,
      hasPriorRedemption: false,
    });
    expect(eligibility.ok).toBe(false);
  });

  it("accepts and applies the code once the site-wide-discounted price clears the minimum, and the promo code's own discount stacks on top of the item discount", () => {
    // ₱3,000 original, 5% site-wide discount -> ₱2,850 — clears ₱2,000.
    const discounts = withSiteWideDiscount([], "p1", { enabled: true, type: "PERCENTAGE", amount: 5 });
    const item: CartSkuInput = {
      sku: makeSku(300000),
      quantity: 1,
      productType: "DECANT",
      productBrand: "Maison Ivre",
      discounts,
    };
    const priced = priceCart([item], { deliveryFeeCentavos: 12000, freeShipping: false });
    expect(priced.merchandiseSubtotalCentavos).toBe(285000);

    const code = makeCode({ scope: "ORDER", type: "PERCENTAGE", amount: 10, minSpendCentavos: 200000 });
    const eligibility = checkPromoCodeEligibility(code, {
      merchandiseSubtotalCentavos: priced.merchandiseSubtotalCentavos,
      deliveryFeeCentavos: 12000,
      isFirstOrder: false,
      hasPriorRedemption: false,
    });
    expect(eligibility.ok).toBe(true);

    const totals = buildCartTotals(
      priced,
      { decantThresholdCentavos: 200000, deliveryFeeCentavos: 12000, freeDeliveryEnabled: false, testerBonusEnabled: false, siteWideDiscount: { enabled: true, type: "PERCENTAGE", amount: 5 } },
      "DELIVERY",
      { scope: code.scope, type: code.type, amount: code.amount },
    );
    // 10% of the already-item-discounted 285000 = 28500.
    expect(totals.orderDiscountCentavos).toBe(28500);
    expect(totals.merchandiseSubtotalCentavos).toBe(285000);
    expect(totals.totalCentavos).toBe(285000 - 28500 + 12000);
  });

  it("evaluates a DELIVERY-scope code's discount against the delivery fee, unaffected by item/order discounts", () => {
    const discounts = withSiteWideDiscount([], "p1", { enabled: true, type: "PERCENTAGE", amount: 5 });
    const item: CartSkuInput = {
      sku: makeSku(300000),
      quantity: 1,
      productType: "DECANT",
      productBrand: "Maison Ivre",
      discounts,
    };
    const priced = priceCart([item], { deliveryFeeCentavos: 12000, freeShipping: false });
    const code = makeCode({ scope: "DELIVERY", type: "PERCENTAGE", amount: 100 });
    const totals = buildCartTotals(
      priced,
      { decantThresholdCentavos: 200000, deliveryFeeCentavos: 12000, freeDeliveryEnabled: false, testerBonusEnabled: false, siteWideDiscount: { enabled: true, type: "PERCENTAGE", amount: 5 } },
      "DELIVERY",
      { scope: code.scope, type: code.type, amount: code.amount },
    );
    expect(totals.deliveryDiscountCentavos).toBe(12000);
    expect(totals.deliveryFeeCentavos).toBe(0);
    expect(totals.orderDiscountCentavos).toBe(0);
  });

  it("bestDiscount picks the site-wide discount only when it beats a product's own discount, never both", () => {
    const productOwn = [
      {
        id: "own1",
        productId: "p1",
        type: "PERCENTAGE" as const,
        amount: 20,
        startsAt: null,
        endsAt: null,
        isActive: true,
        createdAt: new Date(),
      },
    ];
    const combined = withSiteWideDiscount(productOwn, "p1", { enabled: true, type: "PERCENTAGE", amount: 5 });
    const best = bestDiscount(combined, 100000);
    // The product's own 20% (20000) beats the site-wide 5% (5000).
    expect(best?.id).toBe("own1");
    const { perUnitDiscountCentavos } = applyDiscount(100000, best);
    expect(perUnitDiscountCentavos).toBe(20000);
  });
});
