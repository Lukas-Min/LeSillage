import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderEmailInput } from "@/lib/email-templates";

// Romel's order shape: two decants, a 10% order code split across them.
const input: OrderEmailInput = {
  orderNumber: "LS-20261007-TEST",
  status: "CONFIRMED",
  recipientName: "Romel",
  email: "romel@example.com",
  fulfillmentMethod: "DELIVERY",
  lines: [
    {
      productName: "Good Girl",
      skuLabel: "10ml Decant",
      quantity: 1,
      originalUnitCentavos: 89500,
      unitPriceCentavos: 89500,
      lineTotalCentavos: 89500,
      discountCentavos: 0,
      productType: "DECANT",
      fulfillment: "ON_HAND",
      promoShareCentavos: 8950,
      promoCode: "PAYDAYBUDOL",
    },
    {
      productName: "Y Eau de Parfum",
      skuLabel: "30ml Decant",
      quantity: 1,
      originalUnitCentavos: 214500,
      unitPriceCentavos: 214500,
      lineTotalCentavos: 214500,
      discountCentavos: 0,
      productType: "DECANT",
      fulfillment: "ON_HAND",
      promoShareCentavos: 21450,
      promoCode: "PAYDAYBUDOL",
    },
  ],
  // The stored subtotal already has the code taken off.
  subtotalCentavos: 273600,
  discountCentavos: 30400,
  deliveryFeeCentavos: 0,
  totalCentavos: 273600,
  orderedAt: new Date("2026-10-07T04:00:00Z"),
};

describe("order emails with a promo code", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://test");
    vi.stubEnv("AUTH_SECRET", "0".repeat(32));
    vi.stubEnv("ADMIN_PASSWORD", "abcdef1");
    vi.stubEnv("GMAIL_APP_PASSWORD", "xxxxxxxx");
    vi.stubEnv("APP_URL", "https://lesillagemanila.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("shows each item's price after the code, the price before it, and the code's share", async () => {
    const { orderConfirmedEmail } = await import("@/lib/email-templates");
    const email = orderConfirmedEmail(input);

    expect(email.text).toContain("Good Girl (10ml Decant) × 1 — ~~₱895.00~~ ₱805.50 (−₱89.50 PAYDAYBUDOL)");
    expect(email.text).toContain("Y Eau de Parfum (30ml Decant) × 1 — ~~₱2,145.00~~ ₱1,930.50 (−₱214.50 PAYDAYBUDOL)");
    expect(email.text).toContain("Subtotal: ₱3,040.00");
    expect(email.text).toContain("Promo code (PAYDAYBUDOL): -₱304.00");

    expect(email.html).toContain("₱805.50");
    expect(email.html).toMatch(/text-decoration:line-through[^>]*>₱895\.00/);
    expect(email.html).toContain("−₱89.50 PAYDAYBUDOL");
    expect(email.html).toContain("Promo code (PAYDAYBUDOL)");
  });
});
