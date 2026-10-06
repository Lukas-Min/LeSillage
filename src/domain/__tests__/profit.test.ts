import { describe, expect, it } from "vitest";
import { phMonthStart, summarizeProfit } from "../profit";
import { productsMissingCost, type CostCheckProduct, type CostCheckSku } from "../product-cost";

describe("phMonthStart", () => {
  it("is midnight on the 1st in Manila, which is 16:00 UTC the day before", () => {
    expect(phMonthStart(new Date("2026-10-06T10:00:00Z")).toISOString()).toBe("2026-09-30T16:00:00.000Z");
    expect(phMonthStart(new Date("2026-10-06T10:00:00Z"), 1).toISOString()).toBe("2026-08-31T16:00:00.000Z");
  });

  it("uses Manila's calendar, not UTC's, around a month end", () => {
    // 17:00 UTC on Sep 30 is already 01:00 on Oct 1 in Manila.
    expect(phMonthStart(new Date("2026-09-30T17:00:00Z")).toISOString()).toBe("2026-09-30T16:00:00.000Z");
    expect(phMonthStart(new Date("2026-09-30T15:00:00Z")).toISOString()).toBe("2026-08-31T16:00:00.000Z");
  });

  it("goes back across a year", () => {
    expect(phMonthStart(new Date("2026-01-15T00:00:00Z"), 1).toISOString()).toBe("2025-11-30T16:00:00.000Z");
  });
});

describe("summarizeProfit", () => {
  it("works out profit and margin", () => {
    expect(summarizeProfit({ orders: 3, salesCentavos: 100000, costCentavos: 70000 })).toEqual({
      orders: 3,
      salesCentavos: 100000,
      costCentavos: 70000,
      profitCentavos: 30000,
      marginPercent: 30,
    });
  });

  it("has no margin without sales, and can be a loss", () => {
    expect(summarizeProfit({ orders: 0, salesCentavos: 0, costCentavos: 0 }).marginPercent).toBeNull();
    expect(summarizeProfit({ orders: 1, salesCentavos: 1000, costCentavos: 1500 }).profitCentavos).toBe(-500);
  });
});

const product = (overrides: Partial<CostCheckProduct> = {}): CostCheckProduct => ({
  id: "p1",
  brand: "Khadlaj",
  name: "Shiyaaka Snow",
  type: "FULL_BOTTLE",
  isActive: true,
  costPrice: 165000,
  ...overrides,
});
const sku = (overrides: Partial<CostCheckSku> = {}): CostCheckSku => ({
  productId: "p1",
  isActive: true,
  provenance: "RETAIL",
  costPrice: 165000,
  fulfillment: "ON_HAND",
  stock: 1,
  ...overrides,
});

describe("productsMissingCost", () => {
  it("lists a product with no cost, null or zero, and skips one with a cost", () => {
    const list = productsMissingCost(
      [product({ id: "a", costPrice: null }), product({ id: "b", costPrice: 0 }), product({ id: "c" })],
      [sku({ productId: "a" }), sku({ productId: "b" }), sku({ productId: "c" })],
    );
    expect(list.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("checks a retail decant's own cost, not the product's", () => {
    const decant = product({ id: "d", type: "DECANT", costPrice: null });
    expect(productsMissingCost([decant], [sku({ productId: "d", costPrice: 5000 })])).toEqual([]);
    expect(productsMissingCost([decant], [sku({ productId: "d", costPrice: 0 })]).map((p) => p.id)).toEqual(["d"]);
  });

  it("checks the product's cost for an in-house decant", () => {
    const decant = product({ id: "d", type: "DECANT", costPrice: 0 });
    expect(productsMissingCost([decant], [sku({ productId: "d", provenance: "IN_HOUSE", costPrice: 0 })])).toHaveLength(1);
  });

  it("leaves archived products out and sorts by brand then name", () => {
    const archived = product({ id: "x", isActive: false, costPrice: 0 });
    const list = productsMissingCost(
      [product({ id: "b", brand: "Zara", costPrice: 0 }), product({ id: "a", brand: "Armaf", costPrice: 0 }), archived],
      [sku({ productId: "b" }), sku({ productId: "a" }), sku({ productId: "x", isActive: false })],
    );
    expect(list.map((p) => p.id)).toEqual(["a", "b"]);
  });
});
