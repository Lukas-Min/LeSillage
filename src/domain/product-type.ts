import type { Condition, FragranceCategory, ProductType, Provenance } from "@/db/schema";

export function labelForType(type: ProductType): string {
  switch (type) {
    case "DECANT":
      return "Decant";
    case "FULL_BOTTLE":
      return "Full bottle";
    case "PARTIAL":
      return "Partial";
    default: {
      const exhaustive: never = type;
      return String(exhaustive);
    }
  }
}

const CATEGORY_LABELS: Record<FragranceCategory, string> = {
  NICHE: "Niche",
  DESIGNER: "Designer",
  MIDDLE_EASTERN: "Middle Eastern",
};

export function labelForCategory(category: FragranceCategory): string {
  return CATEGORY_LABELS[category];
}

export function labelForCondition(c: Condition): string {
  switch (c) {
    case "BNIB":
      return "BNIB";
    case "SEALED":
      return "Sealed";
    case "FEW_SPRAYS_MISSING":
      return "A few sprays missing";
    case "PARTIAL_ML":
      return "Partial (ml)";
    default: {
      const exhaustive: never = c;
      return String(exhaustive);
    }
  }
}

export function labelForProvenance(p: Provenance): string {
  switch (p) {
    case "RETAIL":
      return "Retail";
    case "TESTER":
      return "Tester";
    default: {
      const exhaustive: never = p;
      return String(exhaustive);
    }
  }
}
