import type { PricingMode } from "@/db/schema";

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