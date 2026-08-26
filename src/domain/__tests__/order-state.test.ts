import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  describeStatus,
  isTerminal,
  requiresReason,
} from "../order-state";

describe("order state transitions", () => {
  it("allows happy path", () => {
    expect(canTransition("AWAITING_PAYMENT", "RECEIPT_SUBMITTED")).toBe(true);
    expect(canTransition("RECEIPT_SUBMITTED", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "SHIPPED")).toBe(true);
    expect(canTransition("SHIPPED", "COMPLETED")).toBe(true);
  });

  it("allows rejection from non-terminal states with reason", () => {
    expect(canTransition("RECEIPT_SUBMITTED", "REJECTED")).toBe(true);
    expect(requiresReason("REJECTED")).toBe(true);
  });

  it("blocks illegal jumps", () => {
    expect(canTransition("AWAITING_PAYMENT", "CONFIRMED")).toBe(false);
    expect(canTransition("COMPLETED", "SHIPPED")).toBe(false);
  });

  it("isTerminal handles end states", () => {
    expect(isTerminal("COMPLETED")).toBe(true);
    expect(isTerminal("REJECTED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("SHIPPED")).toBe(false);
  });

  it("describeStatus has entries for every status", () => {
    for (const status of [
      "AWAITING_PAYMENT",
      "RECEIPT_SUBMITTED",
      "CONFIRMED",
      "SHIPPED",
      "COMPLETED",
      "REJECTED",
      "CANCELLED",
    ] as const) {
      expect(describeStatus(status)).toBeTruthy();
    }
  });

  it("assertTransition throws on invalid", () => {
    expect(() => assertTransition("AWAITING_PAYMENT", "SHIPPED")).toThrow();
  });
});