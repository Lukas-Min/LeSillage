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
