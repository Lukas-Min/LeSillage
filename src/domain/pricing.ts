import type { PricingMode } from "@/db/schema";
import { ceilToNearestPesos } from "./money";

export interface PricingInputs {
  costPriceCentavos: number;
  mode: PricingMode;
  input: number;
}

export function computeRetailPrice({
  costPriceCentavos,
  mode,
  input,
}: PricingInputs): number {
  if (!Number.isFinite(costPriceCentavos) || costPriceCentavos < 0) {
    throw new Error("costPriceCentavos must be a non-negative number");
  }
  if (!Number.isFinite(input) || input < 0) {
    throw new Error("pricingInput must be a non-negative number");
  }
  switch (mode) {
    case "PERCENTAGE":
      return Math.round(costPriceCentavos * (1 + input / 100));
    case "FIXED":
      return costPriceCentavos + Math.round(input);
    case "DIRECT":
      return Math.round(input);
    default: {
      const exhaustive: never = mode;
      throw new Error(`Unknown pricing mode: ${String(exhaustive)}`);
    }
  }
}

/**
 * Every SKU's retail price derives from the product's single reference
 * price (computed via computeRetailPrice from the product's cost/mode/
 * input) scaled by size — e.g. a 2,000-centavo reference for a 100ml
 * bottle prices a 10ml decant at 2000/100*10 = 200. Sizeless SKUs
 * (sizeMl null/0, or sourceMl unset) just take the reference price as-is.
 *
 * A scaled (per-size) price is then rounded UP to the nearest ₱5 so decant
 * prices always end in a clean 0 or 5, rather than the raw ₱56.55-style
 * fraction the size ratio produces.
 */
export function computeSkuRetailPrice({
  referenceRetailPriceCentavos,
  sourceMl,
  sizeMl,
}: {
  referenceRetailPriceCentavos: number;
  sourceMl: number | null | undefined;
  sizeMl: number | null | undefined;
}): number {
  if (!sourceMl || !sizeMl) return referenceRetailPriceCentavos;
  const scaled = (referenceRetailPriceCentavos / sourceMl) * sizeMl;
  return ceilToNearestPesos(scaled, 5);
}

export function pricingInputLabel(mode: PricingMode): string {
  switch (mode) {
    case "PERCENTAGE":
      return "Markup %";
    case "FIXED":
      return "Fixed ₱ increment";
    case "DIRECT":
      return "Retail ₱";
    default: {
      const exhaustive: never = mode;
      throw new Error(`Unknown pricing mode: ${String(exhaustive)}`);
    }
  }
}