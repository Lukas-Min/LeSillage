import type { ProductDiscount } from "@/db/schema";
import type { SiteWideDiscountConfig } from "./promo";

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
  now: Date = new Date(),
): ProductDiscount | null {
  const active = discounts.filter((d) => isDiscountActive(d, now));
  if (active.length === 0) return null;
  return active.sort(
    (a, b) => savingsFor(b, unitPriceCentavos) - savingsFor(a, unitPriceCentavos),
  )[0];
}

function savingsFor(discount: ProductDiscount, unitPriceCentavos: number): number {
  if (discount.type === "PERCENTAGE") {
    return Math.round((unitPriceCentavos * discount.amount) / 100);
  }
  return Math.min(unitPriceCentavos, discount.amount);
}

export function applyDiscount(
  unitPriceCentavos: number,
  discount: ProductDiscount | null,
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