import { describe, expect, it } from "vitest";
import {
  isFreeShippingEligible,
  isTesterBonusEligible,
  siteWideDiscountFromSettings,
  siteWideDiscountStatus,
  testerUnitsAvailable,
} from "../promo";
import { bestDiscount, withSiteWideDiscount } from "../discount";

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
          siteWideDiscount: { enabled: false, type: "PERCENTAGE", amount: 0, startsAt: null, endsAt: null },
        },
      ),
    ).toBe(false);
  });
});

describe("site-wide discount schedule", () => {
  const now = new Date("2026-10-10T04:00:00Z");
  const settings = {
    siteWideDiscountEnabled: true,
    siteWideDiscountType: "PERCENTAGE" as const,
    siteWideDiscountAmount: 10,
    siteWideDiscountStartsAt: new Date("2026-10-01T00:00:00+08:00"),
    siteWideDiscountEndsAt: new Date("2026-10-31T23:59:59+08:00"),
  };

  it("revives ISO-string dates from a cached row", () => {
    // unstable_cache hands Dates back as strings; the type still says Date.
    const cached = JSON.parse(JSON.stringify(settings)) as typeof settings;
    const config = siteWideDiscountFromSettings(cached);
    expect(config.startsAt).toBeInstanceOf(Date);
    expect(config.startsAt?.getTime()).toBe(settings.siteWideDiscountStartsAt.getTime());
    expect(siteWideDiscountStatus(config, now)).toBe("ACTIVE");
  });

  it("reports scheduled, active, ended, and off", () => {
    const config = siteWideDiscountFromSettings(settings);
    expect(siteWideDiscountStatus(config, new Date("2026-09-30T12:00:00Z"))).toBe("SCHEDULED");
    expect(siteWideDiscountStatus(config, now)).toBe("ACTIVE");
    expect(siteWideDiscountStatus(config, new Date("2026-11-01T12:00:00Z"))).toBe("ENDED");
    expect(siteWideDiscountStatus({ ...config, enabled: false }, now)).toBe("OFF");
    expect(siteWideDiscountStatus({ ...config, startsAt: null, endsAt: null }, now)).toBe("ACTIVE");
  });

  it("only discounts inside its window, through the same bestDiscount every price uses", () => {
    const discounts = withSiteWideDiscount([], "p1", siteWideDiscountFromSettings(settings));
    expect(bestDiscount(discounts, 100000, 1, new Date("2026-09-30T12:00:00Z"))).toBeNull();
    expect(bestDiscount(discounts, 100000, 1, now)?.id).toBe("sitewide");
    expect(bestDiscount(discounts, 100000, 1, new Date("2026-11-01T12:00:00Z"))).toBeNull();
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

describe("testerUnitsAvailable", () => {
  it("counts an in-house decant tester in whole pours from the ml pool", () => {
    expect(testerUnitsAvailable({ provenance: "IN_HOUSE", stock: 0, sizeMl: 3, remainingMl: 10 })).toBe(3);
    expect(testerUnitsAvailable({ provenance: "IN_HOUSE", stock: 99, sizeMl: 3, remainingMl: 2 })).toBe(0);
    expect(testerUnitsAvailable({ provenance: "IN_HOUSE", stock: 99, sizeMl: 0, remainingMl: 50 })).toBe(0);
    expect(testerUnitsAvailable({ provenance: "IN_HOUSE", stock: 0, sizeMl: 2, remainingMl: null })).toBe(0);
  });

  it("uses unit stock for a retail decant tester", () => {
    expect(testerUnitsAvailable({ provenance: "RETAIL", stock: 4, sizeMl: 5, remainingMl: 0 })).toBe(4);
    expect(testerUnitsAvailable({ provenance: "RETAIL", stock: -1, sizeMl: 5, remainingMl: 100 })).toBe(0);
  });
});
