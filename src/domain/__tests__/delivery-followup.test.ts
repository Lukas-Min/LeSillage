import { describe, expect, it } from "vitest";
import { DELIVERY_FOLLOWUP_AFTER_MS, isDueForDeliveryFollowup } from "../delivery-followup";

const twoDaysAgo = new Date("2026-09-04T12:00:00.000Z");
const now = new Date(twoDaysAgo.getTime() + DELIVERY_FOLLOWUP_AFTER_MS);

describe("isDueForDeliveryFollowup", () => {
  it("is due two days after delivery, unsent", () => {
    expect(
      isDueForDeliveryFollowup({
        status: "DELIVERED",
        statusUpdatedAt: twoDaysAgo,
        deliveryFollowupSentAt: null,
        now,
      }),
    ).toBe(true);
  });

  it("is not due before two days", () => {
    expect(
      isDueForDeliveryFollowup({
        status: "DELIVERED",
        statusUpdatedAt: twoDaysAgo,
        deliveryFollowupSentAt: null,
        now: new Date(twoDaysAgo.getTime() + DELIVERY_FOLLOWUP_AFTER_MS - 1),
      }),
    ).toBe(false);
  });

  it("is not due once already sent", () => {
    expect(
      isDueForDeliveryFollowup({
        status: "DELIVERED",
        statusUpdatedAt: twoDaysAgo,
        deliveryFollowupSentAt: now,
        now,
      }),
    ).toBe(false);
  });

  it("is not due for any other status", () => {
    expect(
      isDueForDeliveryFollowup({
        status: "SHIPPED",
        statusUpdatedAt: twoDaysAgo,
        deliveryFollowupSentAt: null,
        now,
      }),
    ).toBe(false);
    expect(
      isDueForDeliveryFollowup({
        status: "COMPLETED",
        statusUpdatedAt: twoDaysAgo,
        deliveryFollowupSentAt: null,
        now,
      }),
    ).toBe(false);
  });
});
