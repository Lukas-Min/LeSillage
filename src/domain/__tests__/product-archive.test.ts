import { describe, expect, it } from "vitest";
import { isArchivedProduct, isPartialSkuSoldOut, isSoldOutPartial } from "../product-archive";

const onSku = { isActive: true, fulfillment: "ON_HAND" as const, stock: 1 };
const offSku = { isActive: false, fulfillment: "ON_HAND" as const, stock: 1 };
const soldOutSku = { isActive: true, fulfillment: "ON_HAND" as const, stock: 0 };

describe("isArchivedProduct", () => {
  const bottle = (isActive: boolean) => ({ isActive, type: "FULL_BOTTLE" as const });

  it("is archived when hidden with every size switched off", () => {
    expect(isArchivedProduct(bottle(false), [offSku, offSku])).toBe(true);
  });

  it("is only hidden when a size is still on (a fresh import) or it has no sizes yet (a draft)", () => {
    expect(isArchivedProduct(bottle(false), [onSku, offSku])).toBe(false);
    expect(isArchivedProduct(bottle(false), [])).toBe(false);
  });

  it("is never archived by hand while visible", () => {
    expect(isArchivedProduct(bottle(true), [offSku])).toBe(false);
  });

  it("archives a visible partial once it's sold out", () => {
    expect(isArchivedProduct({ isActive: true, type: "PARTIAL" }, [soldOutSku])).toBe(true);
  });

  it("doesn't archive an empty full bottle or decant by the partial rule", () => {
    expect(isArchivedProduct(bottle(true), [soldOutSku])).toBe(false);
    expect(isArchivedProduct({ isActive: true, type: "DECANT" }, [soldOutSku])).toBe(false);
  });
});

describe("isSoldOutPartial", () => {
  const partial = { isActive: true, type: "PARTIAL" as const };

  it("is sold out when every size is sold out or switched off", () => {
    expect(isSoldOutPartial(partial, [soldOutSku])).toBe(true);
    expect(isSoldOutPartial(partial, [soldOutSku, offSku])).toBe(true);
  });

  it("isn't while any size still has stock", () => {
    expect(isSoldOutPartial(partial, [soldOutSku, onSku])).toBe(false);
  });

  it("leaves a hidden partial (a draft being set up) and one with no sizes alone", () => {
    expect(isSoldOutPartial({ ...partial, isActive: false }, [soldOutSku])).toBe(false);
    expect(isSoldOutPartial(partial, [])).toBe(false);
  });

  it("doesn't count a pre-order size as sold out", () => {
    expect(isPartialSkuSoldOut({ fulfillment: "PRE_ORDER", stock: 0 })).toBe(false);
    expect(isSoldOutPartial(partial, [{ isActive: true, fulfillment: "PRE_ORDER", stock: 0 }])).toBe(false);
  });
});
