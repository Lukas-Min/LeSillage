import { describe, expect, it } from "vitest";
import { priceCart, type CartSkuInput } from "../cart";
import type { ProductDiscount, Sku } from "@/db/schema";

function makeSku(overrides: Partial<Sku> = {}): Sku {
  const now = new Date();
  return {
    id: "x",
    productId: "p",
    sku: "X",
    label: "X",
    sizeMl: null,
    remainingMl: null,
    condition: "BNIB",
    provenance: "RETAIL",
    packaging: "WITH_BOX",
    costPrice: 100000,
    retailPrice: 150000,
    pricingMode: "PERCENTAGE",
    pricingInput: 50,
    fulfillment: "ON_HAND",
    stock: 5,
    isTester: false,
    testerFamily: null,
    testerBrand: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const tenPercentOff = (id = "1"): ProductDiscount => ({
  id,
  productId: "p",
  type: "PERCENTAGE",
  amount: 10,
  startsAt: null,
  endsAt: null,
  isActive: true,
  createdAt: new Date(),
});

const fixed200Off = (id = "2"): ProductDiscount => ({
  id,
  productId: "p",
  type: "FIXED",
  amount: 20000,
  startsAt: null,
  endsAt: null,
  isActive: true,
  createdAt: new Date(),
});

function buildItem(sku: Sku, overrides: Partial<CartSkuInput> = {}): CartSkuInput {
  return {
    sku,
    quantity: 1,
    productType: "DECANT",
    productBrand: "Maison Ivre",
    productFamily: "Woody",
    ...overrides,
  };
}

describe("priceCart", () => {
  it("uses retailPrice as the single source of truth", () => {
    const totals = priceCart(
      [buildItem(makeSku({ id: "a", retailPrice: 250000 }), { quantity: 2 })],
      { deliveryFeeCentavos: 12000, freeShipping: false },
    );
    expect(totals.lines[0].unitPriceCentavos).toBe(250000);
    expect(totals.merchandiseSubtotalCentavos).toBe(500000);
    expect(totals.discountCentavos).toBe(0);
    expect(totals.totalCentavos).toBe(500000 + 12000);
  });

  it("applies percentage discount per unit when better than a fixed discount", () => {
    const totals = priceCart(
      [
        buildItem(makeSku({ id: "a", retailPrice: 150000 }), {
          quantity: 2,
          discounts: [tenPercentOff("p"), fixed200Off("f")],
        }),
      ],
      { deliveryFeeCentavos: 12000, freeShipping: false },
    );
    expect(totals.discountCentavos).toBe(30000);
    expect(totals.merchandiseSubtotalCentavos).toBe(270000);
  });

  it("prefers the larger realized saving", () => {
    const totals = priceCart(
      [
        buildItem(makeSku({ id: "a", retailPrice: 100000 }), {
          quantity: 1,
          discounts: [tenPercentOff("p"), fixed200Off("f")],
        }),
      ],
      { deliveryFeeCentavos: 12000, freeShipping: false },
    );
    expect(totals.discountCentavos).toBe(20000);
  });

  it("honors freeShipping flag set by caller", () => {
    const totals = priceCart(
      [buildItem(makeSku({ id: "d", retailPrice: 150000 }), { quantity: 8 })],
      { deliveryFeeCentavos: 12000, freeShipping: true },
    );
    expect(totals.deliveryFeeCentavos).toBe(0);
    expect(totals.decantSubtotalCentavos).toBe(1200000);
  });

  it("returns zero discount when no active discount exists", () => {
    const inactive: ProductDiscount = { ...tenPercentOff("x"), isActive: false };
    const totals = priceCart(
      [buildItem(makeSku({ id: "a", retailPrice: 100000 }), { discounts: [inactive] })],
      { deliveryFeeCentavos: 12000, freeShipping: false },
    );
    expect(totals.discountCentavos).toBe(0);
  });
});
