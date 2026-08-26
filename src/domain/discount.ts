import type { ProductDiscount } from "@/db/schema";

export function isDiscountActive(discount: ProductDiscount, now: Date = new Date()): boolean {
  if (!discount.isActive) return false;
  if (discount.startsAt && discount.startsAt > now) return false;
  if (discount.endsAt && discount.endsAt < now) return false;
  return true;
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