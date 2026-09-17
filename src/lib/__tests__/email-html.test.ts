import { describe, expect, it } from "vitest";
import { escapeHtml, renderOrderEmailHtml } from "@/lib/email-html";

const base = {
  siteUrl: "https://le-sillage.vercel.app/",
  eyebrow: "Order LS-2026-0042",
  title: "We received your receipt",
  greeting: "Hi Ana,",
  intro: ["Thank you for your order."],
};

describe("renderOrderEmailHtml", () => {
  it("shows the product photo when the line has one, and an initial when it does not", () => {
    const html = renderOrderEmailHtml({
      ...base,
      items: [
        {
          productName: "Club de Nuit Maleka",
          skuLabel: "10ML",
          quantity: 2,
          unitPriceCentavos: 45000,
          lineTotalCentavos: 90000,
          imageUrl: "https://x.public.blob.vercel-storage.com/maleka.jpg",
        },
        { productName: "Baccarat Rouge 540", skuLabel: "5ML", quantity: 1, unitPriceCentavos: 60000, lineTotalCentavos: 60000, imageUrl: null },
      ],
    });
    expect(html).toContain('<img src="https://x.public.blob.vercel-storage.com/maleka.jpg" width="64" alt=""');
    // No fixed height / object-fit: email clients would squash a portrait shot.
    expect(html).not.toContain("object-fit");
    expect(html).toContain("Club de Nuit Maleka");
    expect(html).toContain("10ML · × 2");
    // No photo → a quiet initial box, never a broken image.
    expect(html).toContain(">B</div>");
    expect(html.match(/<img /g)?.length).toBe(2); // one product photo + the logo
  });

  it("renders a discounted line with the original struck through and the saving", () => {
    const html = renderOrderEmailHtml({
      ...base,
      items: [
        {
          productName: "Layton",
          skuLabel: "3ML",
          quantity: 2,
          originalUnitCentavos: 30000,
          unitPriceCentavos: 27000,
          discountCentavos: 3000,
          lineTotalCentavos: 54000,
        },
      ],
    });
    expect(html).toContain("₱540.00");
    expect(html).toContain("line-through");
    expect(html).toContain("₱600.00");
    expect(html).toContain("Saved ₱60.00");
  });

  it("escapes customer- and admin-supplied text everywhere it lands", () => {
    const html = renderOrderEmailHtml({
      ...base,
      greeting: 'Hi <script>alert("x")</script>,',
      facts: [{ label: "Reason", value: "Blurry <img onerror=x>" }],
      items: [{ productName: "A & B <i>", skuLabel: "", quantity: 1, unitPriceCentavos: 100, lineTotalCentavos: 100, imageUrl: 'https://h/i.jpg" onload="x' }],
      cta: { label: "Pay <now>", url: "https://h/pay?a=1&b=2" },
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("A &amp; B &lt;i&gt;");
    expect(html).toContain('src="https://h/i.jpg&quot; onload=&quot;x"');
    expect(html).toContain('href="https://h/pay?a=1&amp;b=2"');
    expect(html).toContain("Pay &lt;now&gt;");
  });

  it("builds the logo and footer link from the site origin without a trailing slash", () => {
    const html = renderOrderEmailHtml(base);
    expect(html).toContain('src="https://le-sillage.vercel.app/logo/mark.png"');
    expect(html).toContain('href="https://le-sillage.vercel.app"');
    expect(html).not.toContain("vercel.app//");
  });

  it("only renders the optional blocks it is given", () => {
    const bare = renderOrderEmailHtml(base);
    expect(bare).not.toContain("Your items");
    expect(bare).not.toContain("border-radius:999px");
    const full = renderOrderEmailHtml({
      ...base,
      totals: [
        { label: "Delivery", value: "Free", strike: "₱120.00", note: "Decant subtotal over ₱2,000" },
        { label: "Total paid", value: "₱2,120.00", strong: true },
      ],
      cta: { label: "View your order", url: "https://le-sillage.vercel.app/account/orders" },
    });
    expect(full).toContain("border-radius:999px");
    expect(full).toContain("₱120.00</span>Free");
    expect(full).toContain("Decant subtotal over ₱2,000");
  });
});

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});
