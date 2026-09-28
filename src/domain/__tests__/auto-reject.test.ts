import { describe, expect, it } from "vitest";
import { AUTO_REJECT_AFTER_MS, isDueForAutoReject } from "../auto-reject";

const fortyEightHoursAgo = new Date("2026-09-04T12:00:00.000Z");
const now = new Date(fortyEightHoursAgo.getTime() + AUTO_REJECT_AFTER_MS);

describe("isDueForAutoReject", () => {
  it("is due after 48 hours still awaiting payment", () => {
    expect(
      isDueForAutoReject({
        status: "AWAITING_PAYMENT",
        statusUpdatedAt: fortyEightHoursAgo,
        now,
      }),
    ).toBe(true);
  });

  it("is not due before 48 hours", () => {
    expect(
      isDueForAutoReject({
        status: "AWAITING_PAYMENT",
        statusUpdatedAt: fortyEightHoursAgo,
        now: new Date(fortyEightHoursAgo.getTime() + AUTO_REJECT_AFTER_MS - 1),
      }),
    ).toBe(false);
  });

  it("is not due once a receipt has been submitted", () => {
    expect(
      isDueForAutoReject({
        status: "RECEIPT_SUBMITTED",
        statusUpdatedAt: fortyEightHoursAgo,
        now,
      }),
    ).toBe(false);
  });
});
