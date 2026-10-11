import { describe, expect, it } from "vitest";
import { auditCategory, auditDayLabel, describeAuditEvent, type AuditLookups } from "../audit-describe";

const ADMIN = "11111111-1111-4111-8111-111111111111";
const CUSTOMER = "22222222-2222-4222-8222-222222222222";
const ORDER = "33333333-3333-4333-8333-333333333333";
const PRODUCT = "44444444-4444-4444-8444-444444444444";
const SKU = "55555555-5555-4555-8555-555555555555";

const lookups: AuditLookups = {
  users: new Map([
    [ADMIN, { name: "Le Sillage Admin", email: "admin@example.com", role: "ADMIN" }],
    [CUSTOMER, { name: "Ria", email: "ria@example.com", role: "CUSTOMER" }],
  ]),
  orders: new Map([[ORDER, "LS-0042"]]),
  products: new Map([[PRODUCT, { brand: "Lanvin", name: "Eclat d'Arpège" }]]),
  skus: new Map([[SKU, { label: "100ml Full bottle", productId: PRODUCT }]]),
  promoCodes: new Map(),
  qrCodes: new Map(),
};

const text = (segments: ReturnType<typeof describeAuditEvent>["segments"]) =>
  segments.map((s) => (typeof s === "string" ? s : s.text)).join("");

describe("describeAuditEvent", () => {
  it("names the order and the new status, with the reason as a detail", () => {
    const d = describeAuditEvent(
      { actor: ADMIN, action: "ORDER_STATUS", targetType: "order", targetId: ORDER, metadata: { to: "READY_FOR_PICKUP", reason: "Paid in full" } },
      lookups,
    );
    expect(d.actor.label).toBe("Le Sillage Admin");
    expect(text(d.segments)).toBe("moved order LS-0042 to Ready for pickup");
    expect(d.segments).toContainEqual({ text: "order LS-0042", href: `/admin/orders/${ORDER}` });
    expect(d.details).toEqual(["Reason: Paid in full"]);
    expect(d.category).toBe("orders");
  });

  it("shows a new product's price, cost and markup", () => {
    const d = describeAuditEvent(
      { actor: ADMIN, action: "PRODUCT_CREATE", targetType: "product", targetId: PRODUCT, metadata: { retailPrice: 282000, costPrice: 235000, markupPercent: 20 } },
      lookups,
    );
    expect(text(d.segments)).toBe("added Lanvin Eclat d'Arpège");
    expect(d.details[0]).toMatch(/2,820\.00.*cost.*2,350\.00 \+ 20%/);
  });

  it("describes a size edit by its label and product", () => {
    const d = describeAuditEvent({ actor: ADMIN, action: "SKU_UPDATE", targetType: "sku", targetId: SKU, metadata: null }, lookups);
    expect(text(d.segments)).toBe("edited the 100ml Full bottle size of Lanvin Eclat d'Arpège");
  });

  it("speaks of a customer's own actions as theirs, linking the customer", () => {
    const d = describeAuditEvent(
      { actor: CUSTOMER, action: "WISHLIST_TOGGLE", targetType: "product", targetId: PRODUCT, metadata: { saved: true } },
      lookups,
    );
    expect(d.actor).toEqual({ label: "Ria", href: `/admin/customers/${CUSTOMER}`, system: false });
    expect(text(d.segments)).toBe("saved Lanvin Eclat d'Arpège to their wishlist");
    expect(d.category).toBe("customers");
  });

  it("reads a quota error from a system job and falls back for deleted things", () => {
    const d = describeAuditEvent(
      {
        actor: "fragella-refresh",
        action: "FRAGELLA_REFRESH",
        targetType: "product",
        targetId: "gone",
        metadata: { query: "Armaf Club De Nuit", error: 'Fragella 429: {"error":"Too Many Requests: quota exceeded."}' },
      },
      lookups,
    );
    expect(d.actor).toEqual({ label: "System (fragella refresh)", system: true });
    expect(text(d.segments)).toBe("couldn't refresh the rating for Armaf Club De Nuit");
    expect(d.details).toEqual(["Too Many Requests: quota exceeded."]);
  });

  it("summarises a promo code's terms", () => {
    const d = describeAuditEvent(
      {
        actor: ADMIN,
        action: "PROMO_CODE_CREATE",
        targetType: "promo_code",
        targetId: "x",
        metadata: { code: "PAHABOL10", type: "PERCENTAGE", scope: "ORDER", amount: 10, allowedUserIds: [CUSTOMER] },
      },
      lookups,
    );
    expect(text(d.segments)).toBe("created promo code PAHABOL10");
    expect(d.details).toEqual(["10% off the order", "Only for 1 customer"]);
  });
});

describe("auditCategory", () => {
  it("files actions under their tab", () => {
    expect(auditCategory("QR_UPDATE")).toBe("payments");
    expect(auditCategory("ANNOUNCEMENT_UPDATE")).toBe("promos");
    expect(auditCategory("AUTH_SIGNUP")).toBe("customers");
    expect(auditCategory("FRAGELLA_REFRESH")).toBe("catalog");
  });
});

describe("auditDayLabel", () => {
  it("uses Today and Yesterday in Manila time", () => {
    const now = new Date("2026-10-11T03:00:00Z"); // 11:00 in Manila
    expect(auditDayLabel(new Date("2026-10-10T17:30:00Z"), now)).toBe("Today"); // 01:30 Oct 11 Manila
    expect(auditDayLabel(new Date("2026-10-10T10:00:00Z"), now)).toBe("Yesterday");
    expect(auditDayLabel(new Date("2026-10-04T10:00:00Z"), now)).toBe("Sun, Oct 4, 2026");
  });
});
