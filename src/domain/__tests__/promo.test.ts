import { describe, expect, it } from "vitest";
import {
  isFreeShippingEligible,
  isTesterBonusEligible,
  pickTester,
} from "../promo";

describe("promo thresholds", () => {
  it("qualifies when decant subtotal meets threshold", () => {
    expect(
      isFreeShippingEligible([
        { productType: "DECANT", discountedLineTotalCentavos: 220000 },
      ]),
    ).toBe(true);
  });

  it("does not qualify when other categories meet the threshold", () => {
    expect(
      isFreeShippingEligible([
        { productType: "FULL_BOTTLE", discountedLineTotalCentavos: 500000 },
      ]),
    ).toBe(false);
  });

  it("can be disabled via config", () => {
    expect(
      isFreeShippingEligible(
        [{ productType: "DECANT", discountedLineTotalCentavos: 250000 }],
        {
          decantThresholdCentavos: 200000,
          deliveryFeeCentavos: 12000,
          freeDeliveryEnabled: false,
          testerBonusEnabled: true,
          siteWideDiscount: { enabled: false, type: "PERCENTAGE", amount: 0 },
        },
      ),
    ).toBe(false);
  });
});

describe("pickTester", () => {
  const candidates = [
    { skuId: "wood-match", family: "Woody", brand: "Maison Ivre", stock: 3 },
    { skuId: "aquatic-match", family: "Aquatic", brand: "Casa Luz", stock: 1 },
    { skuId: "unrelated", family: "Floral", brand: "Bloom", stock: 5 },
  ];

  it("prefers matching fragrance family", () => {
    const result = pickTester(
      candidates,
      new Set(["Woody"]),
      new Set(),
      () => 0,
    );
    expect(result).toEqual({ result: "ASSIGNED", skuId: "wood-match" });
  });

  it("falls back to matching brand", () => {
    const result = pickTester(
      candidates,
      new Set(),
      new Set(["Casa Luz"]),
      () => 0,
    );
    expect(result).toEqual({ result: "ASSIGNED", skuId: "aquatic-match" });
  });

  it("returns PENDING when nothing in stock matches", () => {
    const result = pickTester(
      candidates.map((c) => ({ ...c, stock: 0 })),
      new Set(["Woody"]),
      new Set(["Maison Ivre"]),
      () => 0,
    );
    expect(result.result).toBe("PENDING");
    expect(result.skuId).toBeNull();
  });
});

describe("isTesterBonusEligible", () => {
  it("requires decant subtotal", () => {
    expect(
      isTesterBonusEligible([
        { productType: "PARTIAL", discountedLineTotalCentavos: 220000 },
      ]),
    ).toBe(false);
    expect(
      isTesterBonusEligible([
        { productType: "DECANT", discountedLineTotalCentavos: 200000 },
      ]),
    ).toBe(true);
  });
});