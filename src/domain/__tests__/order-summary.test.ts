import { describe, expect, it } from "vitest";
import { allocatePromoToLines, summarizeOrderTotals } from "../order-summary";

describe("summarizeOrderTotals", () => {
  it("shows the lines as the subtotal and the code's discount separately (Rica's PAYDAYSALE15 order)", () => {
    const summary = summarizeOrderTotals({
      lines: [{ lineTotalCentavos: 22500 }, { lineTotalCentavos: 83500 }],
      subtotalCentavos: 90100,
      deliveryFeeCentavos: 0,
      totalCentavos: 90100,
      discountCentavos: 15900,
    });
    expect(summary).toEqual({
      itemsCentavos: 106000,
      promoCodeCentavos: 15900,
      deliveryFeeCentavos: 0,
      totalCentavos: 90100,
      savedCentavos: 15900,
    });
    expect(summary.itemsCentavos - summary.promoCodeCentavos + summary.deliveryFeeCentavos).toBe(summary.totalCentavos);
  });

  it("has no code deduction when only item discounts applied", () => {
    const summary = summarizeOrderTotals({
      lines: [{ lineTotalCentavos: 45000 }],
      subtotalCentavos: 45000,
      deliveryFeeCentavos: 12000,
      totalCentavos: 57000,
      discountCentavos: 5000,
    });
    expect(summary.promoCodeCentavos).toBe(0);
    expect(summary.itemsCentavos + summary.deliveryFeeCentavos).toBe(summary.totalCentavos);
    expect(summary.savedCentavos).toBe(5000);
  });
});

describe("allocatePromoToLines", () => {
  const line = (id: string, lineTotalCentavos: number, itemDiscountCentavos = 0, productType: "DECANT" | "FULL_BOTTLE" = "DECANT") => ({
    id,
    lineTotalCentavos,
    itemDiscountCentavos,
    productType,
  });

  it("splits the promo by line total", () => {
    const shares = allocatePromoToLines([line("a", 30000), line("b", 10000)], 1000);
    expect(shares.get("a")).toBe(750);
    expect(shares.get("b")).toBe(250);
  });

  it("hands out whole centavos that still add up to the promo", () => {
    const shares = allocatePromoToLines([line("a", 10000), line("b", 10000), line("c", 10000)], 100);
    expect([...shares.values()].reduce((sum, share) => sum + share, 0)).toBe(100);
    expect([...shares.values()].sort()).toEqual([33, 33, 34]);
  });

  it("gives nothing to a line that already has its own item discount", () => {
    const shares = allocatePromoToLines([line("a", 20000, 5000), line("b", 20000)], 1000);
    expect(shares.get("a")).toBe(0);
    expect(shares.get("b")).toBe(1000);
  });

  it("follows the code's per-type amounts: a type set to 0 gets none, the rest weigh by percent", () => {
    const decantsOnly = { type: "PERCENTAGE" as const, amount: 15, typeAmounts: { FULL_BOTTLE: 0 } };
    const only = allocatePromoToLines([line("d", 10000), line("f", 20000, 0, "FULL_BOTTLE")], 1500, decantsOnly);
    expect(only.get("d")).toBe(1500);
    expect(only.get("f")).toBe(0);

    const tiered = { type: "PERCENTAGE" as const, amount: 10, typeAmounts: { FULL_BOTTLE: 5 } };
    const split = allocatePromoToLines([line("d", 10000), line("f", 10000, 0, "FULL_BOTTLE")], 1500, tiered);
    expect(split.get("d")).toBe(1000);
    expect(split.get("f")).toBe(500);
  });

  it("never gives a line more than it cost", () => {
    const shares = allocatePromoToLines([line("a", 100), line("b", 100)], 1000);
    expect(shares.get("a")).toBe(100);
    expect(shares.get("b")).toBe(100);
  });

  it("spreads over every line when none is eligible, and gives nothing for no promo", () => {
    const shares = allocatePromoToLines([line("a", 10000, 1000), line("b", 10000, 1000)], 200);
    expect(shares.get("a")).toBe(100);
    expect(shares.get("b")).toBe(100);
    expect(allocatePromoToLines([line("a", 10000)], 0).get("a")).toBe(0);
  });
});
