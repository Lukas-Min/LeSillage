import type { OrderStatus } from "@/db/schema";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  AWAITING_PAYMENT: ["RECEIPT_SUBMITTED", "REJECTED", "CANCELLED"],
  RECEIPT_SUBMITTED: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "REJECTED", "CANCELLED"],
  SHIPPED: ["COMPLETED"],
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