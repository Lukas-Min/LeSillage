import type { Condition, FragranceCategory, Packaging, ProductType, Provenance } from "@/db/schema";

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
    case "IN_HOUSE":
      return "In-house";
    default: {
      const exhaustive: never = p;
      return String(exhaustive);
    }
  }
}

export function labelForPackaging(p: Packaging): string {
  switch (p) {
    case "WITH_BOX":
      return "With box";
    case "BOTTLE_ONLY":
      return "Bottle only";
    default: {
      const exhaustive: never = p;
      return String(exhaustive);
    }
  }
}

/**
 * A full-bottle/partial SKU's condition and packaging collapse into one
 * customer-facing choice: BNIB (new, still boxed — packaging is moot),
 * FP ("full package": not brand-new, but still comes with the box), or
 * BO (bottle only, no box). Distinguishing Sealed from A-few-sprays-missing
 * was never a choice a customer actually needed to make; both now read as
 * FP or BO, whichever packaging says. Decants never use this — it only
 * means anything for FULL_BOTTLE/PARTIAL SKUs, same as condition/packaging
 * themselves.
 */
export type ConditionPackagingChoice = "BNIB" | "FP" | "BO";

/** Smallest-to-largest "how new is it" order — matches how the choices read
 *  in conversation ("either BNIB, FP or BO") and keeps buttons stable. */
export const CONDITION_PACKAGING_ORDER: readonly ConditionPackagingChoice[] = ["BNIB", "FP", "BO"];

export function conditionPackagingChoice(condition: Condition, packaging: Packaging): ConditionPackagingChoice {
  if (condition === "BNIB") return "BNIB";
  return packaging === "WITH_BOX" ? "FP" : "BO";
}

export function labelForConditionPackaging(choice: ConditionPackagingChoice): string {
  return choice;
}

/** "A" / "A and B" / "A, B and C" — matches Fragrantica's own "created by ..." phrasing. */
export function joinPerfumers(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The one canonical short-form product description used everywhere a
 * fragrance is added to the catalog: "By <perfumer(s)> (<year>)." — falls
 * back to the brand when no perfumer is credited, and drops the year
 * parenthetical entirely when it's unknown.
 */
export function formatFragranceDescription(args: {
  brand: string;
  perfumers?: string[] | null;
  releaseYear?: number | null;
}): string {
  const credit = args.perfumers && args.perfumers.length > 0 ? joinPerfumers(args.perfumers) : args.brand;
  return `By ${credit}${args.releaseYear ? ` (${args.releaseYear})` : ""}.`;
}
