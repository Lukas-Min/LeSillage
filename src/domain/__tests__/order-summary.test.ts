import { describe, expect, it } from "vitest";
import { summarizeOrderTotals } from "../order-summary";

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
