import { describe, expect, it } from "vitest";
import { resolveBottleAvailability } from "../product-type";

describe("resolveBottleAvailability", () => {
  it("is ON_HAND whenever stock is positive, regardless of the pre-order toggle", () => {
    expect(resolveBottleAvailability({ stock: 5, availableForPreOrder: false })).toEqual({
      visible: true,
      fulfillment: "ON_HAND",
      cap: 5,
    });
    expect(resolveBottleAvailability({ stock: 1, availableForPreOrder: true })).toEqual({
      visible: true,
      fulfillment: "ON_HAND",
      cap: 1,
    });
  });

  it("falls through to PRE_ORDER, uncapped, when out of stock and opted in", () => {
    expect(resolveBottleAvailability({ stock: 0, availableForPreOrder: true })).toEqual({
      visible: true,
      fulfillment: "PRE_ORDER",
      cap: 99,
    });
  });

  it("is hidden entirely when out of stock and not opted into pre-order", () => {
    const result = resolveBottleAvailability({ stock: 0, availableForPreOrder: false });
    expect(result.visible).toBe(false);
    expect(result.cap).toBe(0);
  });

  it("treats negative stock the same as zero", () => {
    expect(resolveBottleAvailability({ stock: -1, availableForPreOrder: true }).fulfillment).toBe("PRE_ORDER");
    expect(resolveBottleAvailability({ stock: -1, availableForPreOrder: false }).visible).toBe(false);
  });
});
