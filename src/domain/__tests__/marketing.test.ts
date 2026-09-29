import { describe, expect, it } from "vitest";
import { mergeMarketingRecipients, shouldAnnounceSiteWideDiscount, type MarketingAccount } from "../marketing";
import type { SiteWideDiscountConfig } from "../promo";

function account(overrides: Partial<MarketingAccount> = {}): MarketingAccount {
  return {
    email: "ana@example.com",
    name: "Ana",
    marketingOptIn: true,
    deletedAt: null,
    archivedAt: null,
    verified: true,
    ...overrides,
  };
}

describe("mergeMarketingRecipients", () => {
  it("includes opted-in accounts and newsletter sign-ups without an account", () => {
    const recipients = mergeMarketingRecipients([account()], ["guest@example.com"]);
    expect(recipients).toEqual([
      { email: "ana@example.com", name: "Ana" },
      { email: "guest@example.com", name: null },
    ]);
  });

  it("lets an account that turned promotions off win over its newsletter row", () => {
    const recipients = mergeMarketingRecipients([account({ marketingOptIn: false })], ["Ana@Example.com"]);
    expect(recipients).toEqual([]);
  });

  it("skips archived and deleted accounts, even with a newsletter row", () => {
    const recipients = mergeMarketingRecipients(
      [
        account({ email: "archived@example.com", archivedAt: new Date() }),
        account({ email: "deleted@example.com", deletedAt: new Date() }),
      ],
      ["archived@example.com", "deleted@example.com"],
    );
    expect(recipients).toEqual([]);
  });

  it("skips an account that never verified its email, even with a newsletter row", () => {
    expect(mergeMarketingRecipients([account({ verified: false })], ["ana@example.com"])).toEqual([]);
  });

  it("lists an address once, whatever its case", () => {
    const recipients = mergeMarketingRecipients(
      [account({ email: "Ana@Example.com" })],
      ["ana@example.com", "GUEST@example.com", "guest@example.com"],
    );
    expect(recipients.map((recipient) => recipient.email)).toEqual(["ana@example.com", "guest@example.com"]);
  });
});

describe("shouldAnnounceSiteWideDiscount", () => {
  const now = new Date("2026-10-01T04:00:00Z");
  const off: SiteWideDiscountConfig = { enabled: false, type: "PERCENTAGE", amount: 10, startsAt: null, endsAt: null };
  const on: SiteWideDiscountConfig = { ...off, enabled: true };

  it("announces the save that turns the sale on", () => {
    expect(shouldAnnounceSiteWideDiscount(off, on, now)).toBe(true);
  });

  it("announces a sale scheduled to start later", () => {
    expect(shouldAnnounceSiteWideDiscount(off, { ...on, startsAt: new Date("2026-10-05T00:00:00Z") }, now)).toBe(true);
  });

  it("stays quiet when the sale was already on", () => {
    expect(shouldAnnounceSiteWideDiscount(on, { ...on, amount: 20 }, now)).toBe(false);
  });

  it("stays quiet for an amount of 0 or a sale that has already ended", () => {
    expect(shouldAnnounceSiteWideDiscount(off, { ...on, amount: 0 }, now)).toBe(false);
    expect(shouldAnnounceSiteWideDiscount(off, { ...on, endsAt: new Date("2026-09-30T16:00:00Z") }, now)).toBe(false);
  });

  it("announces an ended sale given new dates", () => {
    const ended = { ...on, endsAt: new Date("2026-09-30T16:00:00Z") };
    expect(shouldAnnounceSiteWideDiscount(ended, { ...on, endsAt: new Date("2026-10-10T16:00:00Z") }, now)).toBe(true);
  });

  it("stays quiet when the sale is turned off", () => {
    expect(shouldAnnounceSiteWideDiscount(on, off, now)).toBe(false);
  });
});
