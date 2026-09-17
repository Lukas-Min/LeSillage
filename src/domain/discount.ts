import type { DiscountType, ProductDiscount } from "@/db/schema";
import type { SiteWideDiscountConfig } from "./promo";

/** The only two fields `applyDiscount`/`applyLineDiscount` actually read —
 *  a full `ProductDiscount` satisfies this structurally, and so does a
 *  trimmed `VariantDiscount` (src/domain/variant-options.ts) carried to the
 *  client without its id/productId/isActive/startsAt/endsAt. */
export interface DiscountAmount {
  type: DiscountType;
  amount: number;
}

export function isDiscountActive(discount: ProductDiscount, now: Date = new Date()): boolean {
  if (!discount.isActive) return false;
  if (discount.startsAt && discount.startsAt > now) return false;
  if (discount.endsAt && discount.endsAt < now) return false;
  return true;
}

/**
 * Site-wide discount is one more item-discount candidate in the same
 * "best discount wins" comparison as a product's own `productDiscounts`
 * rows — not a separate mechanism — so "only one item discount applies"
 * falls out of bestDiscount's existing pick-the-larger-saving logic below
 * instead of needing its own rule.
 */
export function withSiteWideDiscount(
  discounts: ProductDiscount[],
  productId: string,
  siteWide: SiteWideDiscountConfig,
): ProductDiscount[] {
  if (!siteWide.enabled || siteWide.amount <= 0) return discounts;
  return [
    ...discounts,
    {
      id: "sitewide",
      productId,
      type: siteWide.type,
      amount: siteWide.amount,
      startsAt: null,
      endsAt: null,
      isActive: true,
      createdAt: new Date(),
    },
  ];
}

export function bestDiscount(
  discounts: ProductDiscount[],
  unitPriceCentavos: number,
  quantity = 1,
  now: Date = new Date(),
): ProductDiscount | null {
  const active = discounts.filter((d) => isDiscountActive(d, now));
  if (active.length === 0) return null;
  return pickHighestSaving(active, unitPriceCentavos, quantity);
}

/**
 * The part of `bestDiscount` that doesn't need the full `ProductDiscount`
 * shape (id/productId/isActive/startsAt/endsAt) — just which type/amount
 * wins for a given quantity. Exported so a client component holding only an
 * already-active shortlist (e.g. `VariantDiscount[]`, carried down from a
 * server-computed `bestDiscount` call) can re-pick the winner as the
 * customer changes quantity, without re-deriving "is this discount active
 * right now" on the client.
 */
export function pickHighestSaving<T extends { type: DiscountType; amount: number }>(
  candidates: T[],
  unitPriceCentavos: number,
  quantity: number,
): T | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) => totalSavingsFor(b, unitPriceCentavos, quantity) - totalSavingsFor(a, unitPriceCentavos, quantity),
  )[0];
}

// PERCENTAGE savings scale per unit; FIXED is a flat amount off the whole line.
function totalSavingsFor(
  discount: { type: DiscountType; amount: number },
  unitPriceCentavos: number,
  quantity: number,
): number {
  if (discount.type === "PERCENTAGE") {
    return Math.round((unitPriceCentavos * discount.amount) / 100) * quantity;
  }
  return Math.min(unitPriceCentavos * quantity, discount.amount);
}

export function applyDiscount(
  unitPriceCentavos: number,
  discount: DiscountAmount | null,
): { discountedUnitCentavos: number; perUnitDiscountCentavos: number } {
  if (!discount) {
    return { discountedUnitCentavos: unitPriceCentavos, perUnitDiscountCentavos: 0 };
  }
  let perUnit = 0;
  if (discount.type === "PERCENTAGE") {
    perUnit = Math.round((unitPriceCentavos * discount.amount) / 100);
  } else if (discount.type === "FIXED") {
    perUnit = Math.min(unitPriceCentavos, discount.amount);
  } else {
    const exhaustive: never = discount.type;
    throw new Error(`Unknown discount type: ${String(exhaustive)}`);
  }
  return {
    discountedUnitCentavos: unitPriceCentavos - perUnit,
    perUnitDiscountCentavos: perUnit,
  };
}

// Line-level application: PERCENTAGE scales with quantity, FIXED is a flat
// amount off the whole line (capped at the line's pre-discount subtotal).
export function applyLineDiscount(
  unitPriceCentavos: number,
  quantity: number,
  discount: DiscountAmount | null,
): { lineSubtotalCentavos: number; lineDiscountCentavos: number } {
  const lineTotal = unitPriceCentavos * quantity;
  if (!discount) {
    return { lineSubtotalCentavos: lineTotal, lineDiscountCentavos: 0 };
  }
  let lineDiscount = 0;
  if (discount.type === "PERCENTAGE") {
    lineDiscount = Math.round((unitPriceCentavos * discount.amount) / 100) * quantity;
  } else if (discount.type === "FIXED") {
    lineDiscount = Math.min(lineTotal, discount.amount);
  } else {
    const exhaustive: never = discount.type;
    throw new Error(`Unknown discount type: ${String(exhaustive)}`);
  }
  return {
    lineSubtotalCentavos: lineTotal - lineDiscount,
    lineDiscountCentavos: lineDiscount,
  };
}