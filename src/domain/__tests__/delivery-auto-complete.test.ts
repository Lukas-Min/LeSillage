import { describe, expect, it } from "vitest";
import { DELIVERY_AUTO_COMPLETE_AFTER_MS, isDueForDeliveryAutoComplete } from "../delivery-auto-complete";

const threeDaysAgo = new Date("2026-09-04T12:00:00.000Z");
const now = new Date(threeDaysAgo.getTime() + DELIVERY_AUTO_COMPLETE_AFTER_MS);

describe("isDueForDeliveryAutoComplete", () => {
  it("is due three days after delivery regardless of the follow-up email", () => {
    expect(
      isDueForDeliveryAutoComplete({ status: "DELIVERED", statusUpdatedAt: threeDaysAgo, now }),
    ).toBe(true);
  });

  it("is not due before three days", () => {
    expect(
      isDueForDeliveryAutoComplete({
        status: "DELIVERED",
        statusUpdatedAt: threeDaysAgo,
        now: new Date(threeDaysAgo.getTime() + DELIVERY_AUTO_COMPLETE_AFTER_MS - 1),
      }),
    ).toBe(false);
  });

  it("is not due for any other status", () => {
    expect(
      isDueForDeliveryAutoComplete({ status: "SHIPPED", statusUpdatedAt: threeDaysAgo, now }),
    ).toBe(false);
    expect(
      isDueForDeliveryAutoComplete({ status: "COMPLETED", statusUpdatedAt: threeDaysAgo, now }),
    ).toBe(false);
  });
});
