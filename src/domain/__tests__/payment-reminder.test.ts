import { describe, expect, it } from "vitest";
import { isDueForPaymentReminder, PAYMENT_REMINDER_AFTER_MS } from "../payment-reminder";

const twoHoursAgo = new Date("2026-09-04T12:00:00.000Z");
const now = new Date(twoHoursAgo.getTime() + PAYMENT_REMINDER_AFTER_MS);

describe("isDueForPaymentReminder", () => {
  it("is due after two hours still awaiting payment, unsent", () => {
    expect(
      isDueForPaymentReminder({
        status: "AWAITING_PAYMENT",
        statusUpdatedAt: twoHoursAgo,
        paymentReminderSentAt: null,
        now,
      }),
    ).toBe(true);
  });

  it("is not due before two hours", () => {
    expect(
      isDueForPaymentReminder({
        status: "AWAITING_PAYMENT",
        statusUpdatedAt: twoHoursAgo,
        paymentReminderSentAt: null,
        now: new Date(twoHoursAgo.getTime() + PAYMENT_REMINDER_AFTER_MS - 1),
      }),
    ).toBe(false);
  });

  it("is not due once already sent", () => {
    expect(
      isDueForPaymentReminder({
        status: "AWAITING_PAYMENT",
        statusUpdatedAt: twoHoursAgo,
        paymentReminderSentAt: now,
        now,
      }),
    ).toBe(false);
  });

  it("is not due after the status has moved", () => {
    expect(
      isDueForPaymentReminder({
        status: "RECEIPT_SUBMITTED",
        statusUpdatedAt: twoHoursAgo,
        paymentReminderSentAt: null,
        now,
      }),
    ).toBe(false);
  });
});
