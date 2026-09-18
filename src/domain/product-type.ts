import type { Condition, Fulfillment, FragranceCategory, Packaging, ProductType, Provenance } from "@/db/schema";

export interface BottleAvailability {
  /** false when this SKU should not appear on the storefront at all — no
   *  stock on hand and not opted into taking pre-orders while empty. */
  visible: boolean;
  /** Meaningful only when `visible` — derived live from stock, mirroring how
   *  an IN_HOUSE decant's fulfillment is derived live from its ml pool
   *  (`decantFulfillment` in `src/domain/decant.ts`) rather than trusted off
   *  a stored column. */
  fulfillment: Fulfillment;
  /** The cart cap: 0 when not visible (nothing to add), the real stock count
   *  when ON_HAND, or 99 when PRE_ORDER — matching the existing convention
   *  that a pre-order is a future restock, not bounded by today's count. */
  cap: number;
}

/**
 * A FULL_BOTTLE SKU's fulfillment and storefront visibility are derived live
 * from its own `stock` and the admin's "available for pre-order" toggle —
 * there's no admin-set Fulfillment dropdown for this product type any more
 * (mirrors how an IN_HOUSE decant's Fulfillment/Stock fields are hidden and
 * computed from its shared ml pool instead — see `decantFulfillment`):
 *
 *   - Any stock on hand always means ON_HAND, regardless of the toggle.
 *   - An empty shelf falls through to the toggle: PRE_ORDER if the admin
 *     opted in, otherwise the SKU is hidden until restocked rather than
 *     shown "sold out" — a full bottle can't be poured to order the way a
 *     decant can, so there's nothing useful to sell while it's empty unless
 *     the admin explicitly says pre-orders are being taken.
 */
export function resolveBottleAvailability(args: {
  stock: number;
  availableForPreOrder: boolean;
}): BottleAvailability {
  if (args.stock > 0) return { visible: true, fulfillment: "ON_HAND", cap: args.stock };
  if (args.availableForPreOrder) return { visible: true, fulfillment: "PRE_ORDER", cap: 99 };
  return { visible: false, fulfillment: "PRE_ORDER", cap: 0 };
}

/**
 * `fulfillment`/`availableForPreOrder` defaults for a freshly-created SKU
 * with no stock yet — the one place every SKU-creation path (admin catalog
 * actions, the Fragrantica importer, the seed/import scripts) should get
 * these from, so a newly-added FULL_BOTTLE-creating path can't forget
 * `availableForPreOrder` and silently ship an invisible SKU (see
 * `resolveBottleAvailability`, which is what actually consumes the flag).
 */
export function newSkuFulfillmentDefaults(type: ProductType): {
  fulfillment: Fulfillment;
  availableForPreOrder: boolean;
} {
  if (type === "FULL_BOTTLE") return { fulfillment: "PRE_ORDER", availableForPreOrder: true };
  return { fulfillment: "ON_HAND", availableForPreOrder: false };
}

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
