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
  quantity = 1,
  now: Date = new Date(),
): ProductDiscount | null {
  const active = discounts.filter((d) => isDiscountActive(d, now));
  if (active.length === 0) return null;
  return active.sort(
    (a, b) =>
      totalSavingsFor(b, unitPriceCentavos, quantity) -
      totalSavingsFor(a, unitPriceCentavos, quantity),
  )[0];
}

// PERCENTAGE savings scale per unit; FIXED is a flat amount off the whole line.
function totalSavingsFor(
  discount: ProductDiscount,
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

// Line-level application: PERCENTAGE scales with quantity, FIXED is a flat
// amount off the whole line (capped at the line's pre-discount subtotal).
export function applyLineDiscount(
  unitPriceCentavos: number,
  quantity: number,
  discount: ProductDiscount | null,
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