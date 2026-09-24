import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  confirmBlockedReason,
  customerCancelMode,
  describeStatus,
  isTerminal,
  requiresReason,
} from "../order-state";

describe("order state transitions", () => {
  it("allows the delivery happy path", () => {
    expect(canTransition("AWAITING_PAYMENT", "RECEIPT_SUBMITTED")).toBe(true);
    expect(canTransition("RECEIPT_SUBMITTED", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "SHIPPED")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
    expect(canTransition("DELIVERED", "COMPLETED")).toBe(true);
  });

  it("allows the pickup happy path", () => {
    expect(canTransition("CONFIRMED", "READY_FOR_PICKUP")).toBe(true);
    expect(canTransition("READY_FOR_PICKUP", "COMPLETED")).toBe(true);
  });

  it("allows a no-show pickup to be cancelled", () => {
    expect(canTransition("READY_FOR_PICKUP", "CANCELLED")).toBe(true);
    expect(customerCancelMode("READY_FOR_PICKUP")).toBeNull();
  });

  it("allows rejection from non-terminal states with reason", () => {
    expect(canTransition("RECEIPT_SUBMITTED", "REJECTED")).toBe(true);
    expect(requiresReason("REJECTED")).toBe(true);
  });

  it("blocks illegal jumps", () => {
    expect(canTransition("AWAITING_PAYMENT", "CONFIRMED")).toBe(false);
    expect(canTransition("SHIPPED", "COMPLETED")).toBe(false);
    expect(canTransition("COMPLETED", "SHIPPED")).toBe(false);
  });

  it("blocks rejection/cancellation once shipped or delivered", () => {
    expect(canTransition("SHIPPED", "REJECTED")).toBe(false);
    expect(canTransition("SHIPPED", "CANCELLED")).toBe(false);
    expect(canTransition("DELIVERED", "CANCELLED")).toBe(false);
  });

  it("customerCancelMode is instant pre-payment-verification, a request once confirmed, and unavailable after", () => {
    expect(customerCancelMode("AWAITING_PAYMENT")).toBe("INSTANT");
    expect(customerCancelMode("RECEIPT_SUBMITTED")).toBe("INSTANT");
    expect(customerCancelMode("CONFIRMED")).toBe("REQUEST");
    expect(customerCancelMode("SHIPPED")).toBeNull();
    expect(customerCancelMode("DELIVERED")).toBeNull();
  });

  it("isTerminal handles end states", () => {
    expect(isTerminal("COMPLETED")).toBe(true);
    expect(isTerminal("REJECTED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("SHIPPED")).toBe(false);
    expect(isTerminal("DELIVERED")).toBe(false);
    expect(isTerminal("READY_FOR_PICKUP")).toBe(false);
  });

  it("describeStatus has entries for every status", () => {
    for (const status of [
      "AWAITING_PAYMENT",
      "RECEIPT_SUBMITTED",
      "CONFIRMED",
      "SHIPPED",
      "DELIVERED",
      "READY_FOR_PICKUP",
      "COMPLETED",
      "REJECTED",
      "CANCELLED",
    ] as const) {
      expect(describeStatus(status)).toBeTruthy();
    }
  });

  it("assertTransition throws on invalid", () => {
    expect(() => assertTransition("AWAITING_PAYMENT", "SHIPPED")).toThrow();
    expect(() => assertTransition("SHIPPED", "COMPLETED")).toThrow();
  });
});

describe("confirmBlockedReason", () => {
  it("blocks Confirm only while a promised tester is still unpicked", () => {
    expect(confirmBlockedReason({ next: "CONFIRMED", promoTesterResult: "PENDING" })).toMatch(/free tester/);
    expect(confirmBlockedReason({ next: "CONFIRMED", promoTesterResult: "ASSIGNED" })).toBeNull();
    expect(confirmBlockedReason({ next: "CONFIRMED", promoTesterResult: "SKIPPED" })).toBeNull();
    expect(confirmBlockedReason({ next: "CONFIRMED", promoTesterResult: null })).toBeNull();
  });

  it("never blocks any other transition", () => {
    expect(confirmBlockedReason({ next: "REJECTED", promoTesterResult: "PENDING" })).toBeNull();
    expect(confirmBlockedReason({ next: "SHIPPED", promoTesterResult: "PENDING" })).toBeNull();
  });
});
