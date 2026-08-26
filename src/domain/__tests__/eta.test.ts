import { describe, expect, it } from "vitest";
import { computeEtaSummary, isWeekendInManila, onHandEta, preOrderEta } from "../eta";

describe("ETA helpers", () => {
  it("returns 3 to 30 days for pre-order", () => {
    const eta = preOrderEta();
    expect(eta.minDays).toBe(3);
    expect(eta.maxDays).toBe(30);
  });

  it("returns weekend same-day for Saturday/Sunday", () => {
    const saturday = new Date("2026-08-29T08:00:00Z");
    const sunday = new Date("2026-08-30T08:00:00Z");
    expect(isWeekendInManila(saturday)).toBe(true);
    expect(isWeekendInManila(sunday)).toBe(true);
    expect(onHandEta(saturday).sameDayAvailable).toBe(true);
  });

  it("returns 1 to 2 days for weekday on-hand", () => {
    const monday = new Date("2026-08-31T08:00:00Z");
    expect(isWeekendInManila(monday)).toBe(false);
    expect(onHandEta(monday).minDays).toBe(1);
  });

  it("summarizes mixed orders with both windows", () => {
    const monday = new Date("2026-08-31T08:00:00Z");
    const summary = computeEtaSummary([
      { fulfillment: "PRE_ORDER", orderedAt: monday },
      { fulfillment: "ON_HAND", orderedAt: monday },
    ]);
    expect(summary.length).toBe(2);
  });
});