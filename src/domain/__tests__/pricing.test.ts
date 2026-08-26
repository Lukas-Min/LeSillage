import { describe, expect, it } from "vitest";
import { computeRetailPrice, pricingInputLabel } from "../pricing";

describe("computeRetailPrice", () => {
  it("applies a percentage markup", () => {
    expect(computeRetailPrice({ costPriceCentavos: 100000, mode: "PERCENTAGE", input: 50 })).toBe(150000);
  });

  it("adds a fixed amount", () => {
    expect(computeRetailPrice({ costPriceCentavos: 100000, mode: "FIXED", input: 25000 })).toBe(125000);
  });

  it("uses direct price verbatim", () => {
    expect(computeRetailPrice({ costPriceCentavos: 100000, mode: "DIRECT", input: 199000 })).toBe(199000);
  });

  it("rounds half-cents up", () => {
    expect(computeRetailPrice({ costPriceCentavos: 101, mode: "PERCENTAGE", input: 50 })).toBe(152);
  });

  it("rejects negative values", () => {
    expect(() => computeRetailPrice({ costPriceCentavos: -1, mode: "PERCENTAGE", input: 0 })).toThrow();
    expect(() => computeRetailPrice({ costPriceCentavos: 0, mode: "FIXED", input: -1 })).toThrow();
  });
});

describe("pricingInputLabel", () => {
  it("returns descriptive labels per mode", () => {
    expect(pricingInputLabel("PERCENTAGE")).toMatch(/Markup/);
    expect(pricingInputLabel("FIXED")).toMatch(/increment/);
    expect(pricingInputLabel("DIRECT")).toMatch(/Retail/);
  });
});