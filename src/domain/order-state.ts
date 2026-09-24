import type { OrderStatus, TesterResult } from "@/db/schema";

// Delivery orders: AWAITING_PAYMENT -> RECEIPT_SUBMITTED -> CONFIRMED ->
// SHIPPED -> DELIVERED -> COMPLETED.
// Pickup orders skip the SHIPPED/DELIVERED pair for a single
// READY_FOR_PICKUP step: ... -> CONFIRMED -> READY_FOR_PICKUP -> COMPLETED.
// This table only encodes which transitions are ever legal, not which one
// applies to a given order's fulfillmentMethod — callers that offer a
// specific forward action (e.g. the admin "Mark shipped"/"Mark ready for
// pickup" buttons) branch on fulfillmentMethod themselves before calling
// transitionOrderStatus, which then asserts against this table regardless.
const transitions: Record<OrderStatus, OrderStatus[]> = {
  AWAITING_PAYMENT: ["RECEIPT_SUBMITTED", "REJECTED", "CANCELLED"],
  RECEIPT_SUBMITTED: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "READY_FOR_PICKUP", "REJECTED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  // A no-show pickup can still be cancelled — the goods never left the
  // store, so this restores stock/promo exactly like CONFIRMED -> CANCELLED
  // does (see releaseStockForOrder/releasePromoCodeRedemption, which key off
  // the order's existing reservation rows, not its prior status).
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid order transition: ${from} → ${to}`);
  }
}

export type CustomerCancelMode = "INSTANT" | "REQUEST";

// AWAITING_PAYMENT/RECEIPT_SUBMITTED: nothing has been verified or prepared
// yet, so the customer can cancel immediately, no admin involved.
// CONFIRMED: payment is verified and the order may already be getting
// packed, so a customer "cancel" here only *requests* it — an admin has to
// approve before it actually becomes CANCELLED (requestOrderCancellation /
// resolveCancellationRequest in src/lib/orders.ts) rather than it happening
// instantly. Every other status either can't be cancelled by anyone
// (SHIPPED/DELIVERED/COMPLETED/REJECTED/CANCELLED) or is admin-only
// (READY_FOR_PICKUP's no-show Cancel, handled in OrderRowActions — not
// self-service, so it isn't wired to the customer's Cancel button/action).
const CUSTOMER_INSTANT_CANCELLABLE: ReadonlySet<OrderStatus> = new Set([
  "AWAITING_PAYMENT",
  "RECEIPT_SUBMITTED",
]);
const CUSTOMER_REQUEST_CANCELLABLE: ReadonlySet<OrderStatus> = new Set(["CONFIRMED"]);

export function customerCancelMode(status: OrderStatus): CustomerCancelMode | null {
  if (CUSTOMER_INSTANT_CANCELLABLE.has(status)) return "INSTANT";
  if (CUSTOMER_REQUEST_CANCELLABLE.has(status)) return "REQUEST";
  return null;
}

export function requiresReason(status: OrderStatus): boolean {
  return status === "REJECTED" || status === "CANCELLED";
}

export function isTerminal(status: OrderStatus): boolean {
  return status === "COMPLETED" || status === "REJECTED" || status === "CANCELLED";
}

// The admin orders list groups every status into one of these three tabs.
// REJECTED folds into "Cancelled" alongside CANCELLED — both are terminal
// outcomes where the order didn't go through, just for different reasons —
// rather than getting a fourth tab of its own.
export type OrderTier = "ONGOING" | "COMPLETED" | "CANCELLED";

export const ORDER_STATUSES_BY_TIER: Record<OrderTier, OrderStatus[]> = {
  ONGOING: ["AWAITING_PAYMENT", "RECEIPT_SUBMITTED", "CONFIRMED", "SHIPPED", "DELIVERED", "READY_FOR_PICKUP"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["REJECTED", "CANCELLED"],
};

export function orderTier(status: OrderStatus): OrderTier {
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "REJECTED" || status === "CANCELLED") return "CANCELLED";
  return "ONGOING";
}

export function describeStatus(status: OrderStatus): string {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "Awaiting your payment";
    case "RECEIPT_SUBMITTED":
      return "Receipt submitted — awaiting verification";
    case "CONFIRMED":
      return "Confirmed — preparing your order";
    case "SHIPPED":
      return "Shipped";
    case "DELIVERED":
      return "Delivered";
    case "READY_FOR_PICKUP":
      return "Ready for pickup";
    case "COMPLETED":
      return "Completed";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    default: {
      const exhaustive: never = status;
      throw new Error(`Unknown status: ${String(exhaustive)}`);
    }
  }
}

/**
 * Why "Confirm" is refused for an order whose free tester hasn't been chosen.
 *
 * A qualifying order leaves receipt submission as PENDING when no brand-matched
 * tester was available to auto-assign; the admin has to pick one (any tester,
 * matching or not) before the order can move on, so a customer is never
 * confirmed with a promised tester that nobody has set aside. SKIPPED orders
 * never earned one and ASSIGNED ones already have theirs — neither is blocked.
 */
export function confirmBlockedReason(args: {
  next: OrderStatus;
  promoTesterResult: TesterResult | null;
}): string | null {
  if (args.next !== "CONFIRMED" || args.promoTesterResult !== "PENDING") return null;
  return "This order earned a free tester — pick one in the Tester bonus card before confirming.";
}
