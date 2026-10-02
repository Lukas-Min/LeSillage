import type { DiscountType, ProductType, PromoCodeTypeAmounts } from "@/db/schema";
import { amountForType } from "@/domain/promo-code";

/**
 * What an order's totals block shows, from what the order stores.
 *
 * createOrderFromCart stores subtotalCentavos with the promo-code order
 * discount already taken off (so subtotal + delivery = total), and
 * discountCentavos as every saving combined (item, order code, delivery
 * code). Showing those two as "Subtotal" and "Discount" reads wrong — the
 * code comes off twice, and item discounts are already in the line prices.
 * So the displayed subtotal is the lines as listed, and only the code's part
 * is shown as a deduction:
 *
 *   itemsCentavos − promoCodeCentavos + deliveryFeeCentavos = totalCentavos
 */
export interface OrderSummaryInput {
  lines: readonly { lineTotalCentavos: number }[];
  subtotalCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
  discountCentavos: number;
}

export interface OrderSummary {
  /** The lines as listed (item discounts already in their prices). */
  itemsCentavos: number;
  /** What an order-scope promo code took off; 0 without one. */
  promoCodeCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
  /** Every saving combined — shown as "You saved", never subtracted. */
  savedCentavos: number;
}

export function summarizeOrderTotals(input: OrderSummaryInput): OrderSummary {
  const itemsCentavos = input.lines.reduce((sum, line) => sum + line.lineTotalCentavos, 0);
  return {
    itemsCentavos,
    promoCodeCentavos: Math.max(0, itemsCentavos - input.subtotalCentavos),
    deliveryFeeCentavos: input.deliveryFeeCentavos,
    totalCentavos: input.totalCentavos,
    savedCentavos: input.discountCentavos,
  };
}

export interface PromoShareLine {
  id: string;
  lineTotalCentavos: number;
  /** Item discount already inside the line total. An order code does not apply to these. */
  itemDiscountCentavos: number;
  productType: ProductType;
}

/**
 * Splits an order-scope promo across the lines it applied to, so each
 * fragrance can show what it cost. Shares are whole centavos and sum to
 * promoCentavos, unless a share would exceed its line (then it is capped).
 * A line that already had its own item discount gets none.
 */
export function allocatePromoToLines(
  lines: readonly PromoShareLine[],
  promoCentavos: number,
  code?: { type: DiscountType; amount: number; typeAmounts: PromoCodeTypeAmounts | null } | null,
): Map<string, number> {
  const shares = new Map<string, number>();
  for (const line of lines) shares.set(line.id, 0);
  if (promoCentavos <= 0 || lines.length === 0) return shares;

  const weightFor = (line: PromoShareLine) => {
    if (line.itemDiscountCentavos > 0 || line.lineTotalCentavos <= 0) return 0;
    if (!code) return line.lineTotalCentavos;
    const amount = amountForType(code, line.productType);
    if (amount <= 0) return 0;
    return code.type === "PERCENTAGE" ? line.lineTotalCentavos * amount : line.lineTotalCentavos;
  };

  let weights = lines.map(weightFor);
  if (weights.every((weight) => weight <= 0)) {
    weights = lines.map((line) => Math.max(0, line.lineTotalCentavos));
  }
  distribute(lines, weights, promoCentavos, shares);
  return shares;
}

function distribute(
  lines: readonly PromoShareLine[],
  weights: number[],
  promoCentavos: number,
  shares: Map<string, number>,
): void {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return;

  const raw = weights.map((weight) => (promoCentavos * weight) / totalWeight);
  const floors = raw.map((value) => Math.floor(value));
  let leftover = promoCentavos - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const entry of order) {
    if (leftover <= 0) break;
    floors[entry.index] += 1;
    leftover -= 1;
  }

  lines.forEach((line, index) => {
    shares.set(line.id, Math.min(floors[index], line.lineTotalCentavos));
  });
}
