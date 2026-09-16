import type { OrderStatus } from "@/db/schema";

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

// The subset of canTransition(status, "CANCELLED") that's the customer's own
// call to make. READY_FOR_PICKUP -> CANCELLED (a no-show) is deliberately
// left out here — that one's an admin decision (OrderRowActions), not
// self-service, so it isn't wired to the customer's Cancel button/action.
const CUSTOMER_CANCELLABLE: ReadonlySet<OrderStatus> = new Set([
  "AWAITING_PAYMENT",
  "RECEIPT_SUBMITTED",
  "CONFIRMED",
]);

export function canCustomerCancel(status: OrderStatus): boolean {
  return CUSTOMER_CANCELLABLE.has(status);
}

export function requiresReason(status: OrderStatus): boolean {
  return status === "REJECTED" || status === "CANCELLED";
}

export function isTerminal(status: OrderStatus): boolean {
  return status === "COMPLETED" || status === "REJECTED" || status === "CANCELLED";
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
