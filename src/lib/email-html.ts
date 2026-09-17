import { formatPHP } from "@/domain/money";

/**
 * HTML rendering for the order emails. Pure — no env, no database — so the
 * layout can be unit-tested and every template shares one shell: the cream
 * card, the wordmark header, the product rows with photos, and the gold CTA.
 *
 * Email clients are not browsers: everything is inline-styled, layout is
 * nested presentational tables (Gmail strips <style>, Outlook ignores flex),
 * the card is capped at 600px and fluid below it so it reads on a phone, and
 * every colour is set explicitly rather than inherited.
 */

const BG = "#f7f3ea";
const CARD = "#ffffff";
const INK = "#2b241c";
const MUTED = "#6b645c";
const GOLD = "#b0893d";
const RULE = "#e6dccb";
const FONT = "Georgia, 'Times New Roman', serif";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface EmailHtmlItem {
  productName: string;
  skuLabel: string;
  quantity: number;
  originalUnitCentavos?: number;
  unitPriceCentavos: number;
  lineTotalCentavos: number;
  discountCentavos?: number;
  /** Current primary product photo; `null`/missing renders an initial instead. */
  imageUrl?: string | null;
}

export interface EmailFact {
  label: string;
  value: string;
}

export interface EmailTotal {
  label: string;
  value: string;
  /** Original amount shown struck through before `value` (a free-delivery line). */
  strike?: string;
  /** Muted qualifier after the value — the reason a delivery was free. */
  note?: string;
  strong?: boolean;
}

export interface OrderEmailHtmlArgs {
  /** Storefront origin — the logo `<img>` and footer link are built from it. */
  siteUrl: string;
  /** Small gold label above the heading, usually the order number. */
  eyebrow: string;
  title: string;
  /** "Hi Ana," — already includes the name; escaped here. */
  greeting: string;
  intro: string[];
  facts?: EmailFact[];
  items?: EmailHtmlItem[];
  totals?: EmailTotal[];
  cta?: { label: string; url: string };
  outro?: string[];
  /** Trailing small print (URLs the text version spells out, "reply to this email"). */
  footnote?: string;
}

function paragraph(text: string, extra = ""): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${INK};${extra}">${escapeHtml(text)}</p>`;
}

function initialFor(name: string): string {
  const letter = name.trim().charAt(0).toUpperCase();
  return letter || "◆";
}

function thumbnail(item: EmailHtmlItem): string {
  const box = `display:block;width:64px;height:64px;border-radius:10px;border:1px solid ${RULE};background:${CARD};`;
  if (item.imageUrl) {
    // alt is empty on purpose: the name sits right beside it, and a broken or
    // blocked image should show a quiet box, not a second copy of the name.
    return `<img src="${escapeHtml(item.imageUrl)}" width="64" height="64" alt="" style="${box}object-fit:cover;object-position:center">`;
  }
  return `<div style="${box}text-align:center;line-height:64px;font-family:${FONT};font-size:24px;color:${GOLD}">${escapeHtml(initialFor(item.productName))}</div>`;
}

function priceCell(item: EmailHtmlItem): string {
  const saving = item.discountCentavos ?? 0;
  const discounted = saving > 0 && item.originalUnitCentavos !== undefined && item.originalUnitCentavos > item.unitPriceCentavos;
  const lineTotal = discounted ? item.unitPriceCentavos * item.quantity : item.lineTotalCentavos;
  const rows = [`<div style="font-size:15px;color:${INK};white-space:nowrap">${formatPHP(lineTotal)}</div>`];
  if (discounted) {
    rows.push(
      `<div style="font-size:12px;color:${MUTED};text-decoration:line-through;white-space:nowrap">${formatPHP((item.originalUnitCentavos ?? 0) * item.quantity)}</div>`,
      `<div style="font-size:12px;color:${GOLD};white-space:nowrap">Saved ${formatPHP(saving * item.quantity)}</div>`,
    );
  }
  return rows.join("");
}

function itemsTable(items: EmailHtmlItem[]): string {
  const rows = items
    .map(
      (item) => `<tr>
  <td width="64" style="padding:12px 0;border-top:1px solid ${RULE};vertical-align:top">${thumbnail(item)}</td>
  <td style="padding:12px 12px;border-top:1px solid ${RULE};vertical-align:top">
    <div style="font-size:15px;font-weight:700;color:${INK};line-height:1.35">${escapeHtml(item.productName)}</div>
    <div style="font-size:13px;color:${MUTED};margin-top:3px">${escapeHtml(item.skuLabel)}${item.skuLabel ? " · " : ""}× ${item.quantity}</div>
  </td>
  <td align="right" style="padding:12px 0;border-top:1px solid ${RULE};vertical-align:top">${priceCell(item)}</td>
</tr>`,
    )
    .join("");
  return `<p style="margin:22px 0 4px;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:${GOLD}">Your items</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-bottom:1px solid ${RULE}">${rows}</table>`;
}

function factsTable(facts: EmailFact[]): string {
  const rows = facts
    .map(
      (fact) => `<tr>
  <td style="padding:6px 16px 6px 0;font-size:13px;color:${MUTED};vertical-align:top;white-space:nowrap">${escapeHtml(fact.label)}</td>
  <td style="padding:6px 0;font-size:14px;color:${INK};vertical-align:top">${escapeHtml(fact.value)}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:4px 0 8px;background:${BG};border-radius:10px;width:100%"><tr><td style="padding:10px 14px"><table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table></td></tr></table>`;
}

function totalsTable(totals: EmailTotal[]): string {
  const rows = totals
    .map((total) => {
      const weight = total.strong ? "font-weight:700;font-size:16px;" : "font-size:14px;";
      const strike = total.strike
        ? `<span style="color:${MUTED};text-decoration:line-through;margin-right:6px">${escapeHtml(total.strike)}</span>`
        : "";
      const note = total.note ? `<div style="font-size:12px;color:${MUTED}">${escapeHtml(total.note)}</div>` : "";
      return `<tr>
  <td style="padding:5px 0;${weight}color:${total.strong ? INK : MUTED}">${escapeHtml(total.label)}</td>
  <td align="right" style="padding:5px 0;${weight}color:${INK};white-space:nowrap">${strike}${escapeHtml(total.value)}${note}</td>
</tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:10px">${rows}</table>`;
}

function ctaButton(cta: { label: string; url: string }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto 6px"><tr>
  <td align="center" style="background:${GOLD};border-radius:999px">
    <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:14px;letter-spacing:0.12em;text-transform:uppercase;color:#1b1610;text-decoration:none;font-weight:700">${escapeHtml(cta.label)}</a>
  </td>
</tr></table>`;
}

export function renderOrderEmailHtml(args: OrderEmailHtmlArgs): string {
  const site = args.siteUrl.replace(/\/$/, "");
  const parts: string[] = [];

  parts.push(
    `<p style="margin:0 0 6px;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:${GOLD}">${escapeHtml(args.eyebrow)}</p>`,
    `<h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;font-weight:700;color:${INK}">${escapeHtml(args.title)}</h1>`,
    paragraph(args.greeting),
    ...args.intro.map((text) => paragraph(text)),
  );
  if (args.facts && args.facts.length > 0) parts.push(factsTable(args.facts));
  if (args.items && args.items.length > 0) parts.push(itemsTable(args.items));
  if (args.totals && args.totals.length > 0) parts.push(totalsTable(args.totals));
  if (args.cta) parts.push(ctaButton(args.cta));
  if (args.outro) parts.push(...args.outro.map((text, index) => paragraph(text, index === 0 ? "margin-top:18px;" : "")));
  if (args.footnote) {
    parts.push(`<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${MUTED}">${escapeHtml(args.footnote)}</p>`);
  }
  parts.push(`<p style="margin:22px 0 0;font-size:15px;color:${INK}">— Le Sillage</p>`);

  return `<div style="margin:0;padding:0;background:${BG}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${CARD};border-radius:16px;font-family:${FONT}">
  <tr><td align="center" style="padding:26px 28px 18px;border-bottom:1px solid ${RULE}">
    <a href="${site}" style="text-decoration:none">
      <img src="${site}/logo/mark.png" width="46" height="40" alt="Le Sillage" style="display:block;margin:0 auto 8px;width:46px;height:40px">
      <span style="display:block;font-family:${FONT};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:${GOLD}">Le Sillage</span>
    </a>
  </td></tr>
  <tr><td style="padding:26px 28px 28px">
${parts.join("\n")}
  </td></tr>
  <tr><td align="center" style="padding:16px 28px 22px;background:${BG};border-radius:0 0 16px 16px;font-size:12px;line-height:1.6;color:${MUTED}">
    Decants, partials and full bottles · <a href="${site}" style="color:${GOLD};text-decoration:none">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a><br>
    Questions? Just reply to this email.
  </td></tr>
</table>
</td></tr></table>
</div>`;
}
