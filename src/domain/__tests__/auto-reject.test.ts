import { describe, expect, it } from "vitest";
import { AUTO_REJECT_AFTER_MS, isDueForAutoReject } from "../auto-reject";

const twentyFourHoursAgo = new Date("2026-09-04T12:00:00.000Z");
const now = new Date(twentyFourHoursAgo.getTime() + AUTO_REJECT_AFTER_MS);

describe("isDueForAutoReject", () => {
  it("is due after 24 hours still awaiting payment", () => {
    expect(
      isDueForAutoReject({
        status: "AWAITING_PAYMENT",
        statusUpdatedAt: twentyFourHoursAgo,
        now,
      }),
    ).toBe(true);
  });

  it("is not due before 24 hours", () => {
    expect(
      isDueForAutoReject({
        status: "AWAITING_PAYMENT",
        statusUpdatedAt: twentyFourHoursAgo,
        now: new Date(twentyFourHoursAgo.getTime() + AUTO_REJECT_AFTER_MS - 1),
      }),
    ).toBe(false);
  });

  it("is not due once a receipt has been submitted", () => {
    expect(
      isDueForAutoReject({
        status: "RECEIPT_SUBMITTED",
        statusUpdatedAt: twentyFourHoursAgo,
        now,
      }),
    ).toBe(false);
  });
});
