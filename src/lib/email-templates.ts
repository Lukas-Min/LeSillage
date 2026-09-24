import { describeStatus } from "@/domain/order-state";
import { computeEtaSummary } from "@/domain/eta";
import { formatPHP } from "@/domain/money";
import { pickupAddressLine } from "@/domain/pickup";
import type { Fulfillment, OrderStatus, ProductType } from "@/db/schema";
import { getEnv } from "@/lib/env";
import { renderOrderEmailHtml, type EmailFact, type EmailTotal } from "@/lib/email-html";

export interface EmailLine {
  productName: string;
  skuLabel: string;
  quantity: number;
  originalUnitCentavos?: number;
  unitPriceCentavos: number;
  lineTotalCentavos: number;
  discountCentavos?: number;
  productType: ProductType;
  fulfillment: Fulfillment;
  /** Primary product photo for the HTML version; the text version ignores it. */
  imageUrl?: string | null;
}

/** Every order email ships both: `text` for plain-text clients and as the
 *  fallback, `html` for the branded version with product photos. */
export interface OrderEmail {
  subject: string;
  text: string;
  html: string;
}

export interface OrderEmailInput {
  orderNumber: string;
  status: OrderStatus;
  recipientName: string;
  email: string;
  fulfillmentMethod: "DELIVERY" | "PICKUP";
  lines: EmailLine[];
  subtotalCentavos: number;
  discountCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
  defaultDeliveryFeeCentavos?: number;
  freeDeliveryReason?: string | null;
  reason?: string | null;
  testerAwarded?: { name: string } | null;
  pickupNotes?: string | null;
  orderedAt: Date;
  payUrl?: string;
  deliveryConfirmUrl?: string;
  contactUrl?: string;
}

function etaLinesSummary(lines: EmailLine[], orderedAt: Date): string {
  const ranges = computeEtaSummary(lines.map((line) => ({ fulfillment: line.fulfillment, orderedAt })));
  if (ranges.length === 0) return "No items in this order.";
  return ranges.map((r) => r.label).join(" · ");
}

function formatLineForEmail(line: EmailLine): string {
  // lineTotalCentavos is the authoritative, DB-stored line total;
  // unitPriceCentavos is only a rounded-per-unit derivative of it and
  // multiplying it back out by quantity can drift a centavo from the real
  // total. The original total and saved amount are both derived from that
  // one authoritative total instead, so original - saved always equals it.
  const originalTotal = line.originalUnitCentavos !== undefined ? line.originalUnitCentavos * line.quantity : undefined;
  if (originalTotal !== undefined && originalTotal > line.lineTotalCentavos) {
    return `- ${line.productName} (${line.skuLabel}) × ${line.quantity} — ~~${formatPHP(originalTotal)}~~ ${formatPHP(line.lineTotalCentavos)} (saved ${formatPHP(originalTotal - line.lineTotalCentavos)})`;
  }
  return `- ${line.productName} (${line.skuLabel}) × ${line.quantity} — ${formatPHP(line.lineTotalCentavos)}`;
}

function deliveryLine(input: OrderEmailInput): string {
  if (input.deliveryFeeCentavos === 0) {
    const reason = input.freeDeliveryReason ?? "Promo applied";
    const original = input.defaultDeliveryFeeCentavos ?? input.deliveryFeeCentavos;
    return `- ~~${formatPHP(original)}~~ Free · ${reason}`;
  }
  return `- ${formatPHP(input.deliveryFeeCentavos)}`;
}

function siteUrl(): string {
  return getEnv().APP_URL.replace(/\/$/, "");
}

/** Same page `payment-reminders.ts` links to; built here so the templates that
 *  never had a URL passed in (order created, receipt rejected) can still offer
 *  a button. */
function paymentPageUrl(orderNumber: string): string {
  return `${siteUrl()}/checkout/payment?orderNumber=${encodeURIComponent(orderNumber)}`;
}

function accountOrdersUrl(): string {
  return `${siteUrl()}/account/orders`;
}

function greeting(input: OrderEmailInput): string {
  return `Hi ${input.recipientName},`;
}

function eyebrow(input: OrderEmailInput): string {
  return `Order ${input.orderNumber}`;
}

function pickupFact(input: OrderEmailInput): EmailFact[] {
  if (input.fulfillmentMethod !== "PICKUP") return [];
  const facts: EmailFact[] = [{ label: "Pickup address", value: pickupAddressLine(input.status) }];
  if (input.pickupNotes?.trim()) {
    facts.push({ label: "Your pickup instructions", value: input.pickupNotes.trim() });
  }
  return facts;
}

/** Plain-text equivalent of pickupFact, for the text-only email bodies. */
function pickupTextBlock(input: OrderEmailInput): string {
  if (input.fulfillmentMethod !== "PICKUP") return "";
  const notes = input.pickupNotes?.trim() ? `\nYour pickup instructions: ${input.pickupNotes.trim()}` : "";
  return `\nPickup address: ${pickupAddressLine(input.status)}${notes}\n`;
}

/** Delivery row for the HTML totals — struck-through default fee plus the
 *  reason when it was free, mirroring `deliveryLine` for the text version. */
function deliveryTotal(input: OrderEmailInput): EmailTotal {
  if (input.deliveryFeeCentavos === 0) {
    const original = input.defaultDeliveryFeeCentavos ?? input.deliveryFeeCentavos;
    return {
      label: "Delivery",
      value: "Free",
      strike: original > 0 ? formatPHP(original) : undefined,
      note: input.freeDeliveryReason ?? "Promo applied",
    };
  }
  return { label: "Delivery", value: formatPHP(input.deliveryFeeCentavos) };
}

function orderTotals(input: OrderEmailInput, totalLabel: string): EmailTotal[] {
  const rows: EmailTotal[] = [{ label: "Subtotal", value: formatPHP(input.subtotalCentavos) }, deliveryTotal(input)];
  if (input.discountCentavos > 0) rows.push({ label: "You saved", value: formatPHP(input.discountCentavos) });
  rows.push({ label: totalLabel, value: formatPHP(input.totalCentavos), strong: true });
  return rows;
}

export function receiptSubmittedEmail(input: OrderEmailInput): OrderEmail {
  const eta = etaLinesSummary(input.lines, input.orderedAt);
  const tester = input.testerAwarded ? `\nFree tester: ${input.testerAwarded.name}\n` : "";
  const subject = `We received your receipt — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

Thank you for your order with Le Sillage Manila. We received your payment receipt and will verify it shortly.

Order: ${input.orderNumber}
Status: ${describeStatus(input.status)}

Items:
${input.lines.map(formatLineForEmail).join("\n")}

Subtotal: ${formatPHP(input.subtotalCentavos)}
Delivery: ${deliveryLine(input)}
Total paid: ${formatPHP(input.totalCentavos)}${input.discountCentavos > 0 ? `\nYou saved: ${formatPHP(input.discountCentavos)}` : ""}

Estimated arrival: ${eta}
${tester}
${pickupTextBlock(input)}
If anything looks off, reply to this email and we will sort it out.

— Le Sillage Manila`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "We received your receipt",
    greeting: greeting(input),
    intro: ["Thank you for your order with Le Sillage Manila. We received your payment receipt and will verify it shortly."],
    facts: [
      { label: "Status", value: describeStatus(input.status) },
      { label: "Estimated arrival", value: eta },
      ...(input.testerAwarded ? [{ label: "Free tester", value: input.testerAwarded.name }] : []),
      ...pickupFact(input),
    ],
    items: input.lines,
    totals: orderTotals(input, "Total paid"),
    cta: { label: "View your order", url: accountOrdersUrl() },
    outro: ["If anything looks off, reply to this email and we will sort it out."],
  });
  return { subject, text, html };
}

export function receiptRejectedEmail(input: OrderEmailInput): OrderEmail {
  const subject = `Receipt needs another look — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

We could not verify the payment receipt for order ${input.orderNumber}.

Reason: ${input.reason ?? "Not provided"}

You can upload a new receipt from your account page. If you believe this is a mistake, reply to this email.

— Le Sillage Manila`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "Receipt needs another look",
    greeting: greeting(input),
    intro: [`We could not verify the payment receipt for order ${input.orderNumber}.`],
    facts: [{ label: "Reason", value: input.reason ?? "Not provided" }],
    items: input.lines,
    totals: [{ label: "Total to pay", value: formatPHP(input.totalCentavos), strong: true }],
    cta: { label: "Upload a new receipt", url: paymentPageUrl(input.orderNumber) },
    outro: ["If you believe this is a mistake, reply to this email."],
  });
  return { subject, text, html };
}

export function orderConfirmedEmail(input: OrderEmailInput): OrderEmail {
  const eta = etaLinesSummary(input.lines, input.orderedAt);
  const tester = input.testerAwarded ? `\nFree tester: ${input.testerAwarded.name}\n` : "";
  const subject = `Payment verified — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

We verified your payment for order ${input.orderNumber}. We are preparing it now.

Items:
${input.lines.map(formatLineForEmail).join("\n")}

Subtotal: ${formatPHP(input.subtotalCentavos)}
Delivery: ${deliveryLine(input)}
Total paid: ${formatPHP(input.totalCentavos)}${input.discountCentavos > 0 ? `\nYou saved: ${formatPHP(input.discountCentavos)}` : ""}

Estimated arrival: ${eta}
${tester}${pickupTextBlock(input)}
— Le Sillage Manila`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "Payment verified",
    greeting: greeting(input),
    intro: [`We verified your payment for order ${input.orderNumber}. We are preparing it now.`],
    facts: [
      { label: "Estimated arrival", value: eta },
      ...(input.testerAwarded ? [{ label: "Free tester", value: input.testerAwarded.name }] : []),
      ...pickupFact(input),
    ],
    items: input.lines,
    totals: orderTotals(input, "Total paid"),
    cta: { label: "View your order", url: accountOrdersUrl() },
  });
  return { subject, text, html };
}

export function orderShippedEmail(input: OrderEmailInput): OrderEmail {
  const subject = `Your order has shipped — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

Order ${input.orderNumber} is on its way. We will message you again when it is marked delivered.

Items:
${input.lines.map(formatLineForEmail).join("\n")}

Subtotal: ${formatPHP(input.subtotalCentavos)}
Delivery: ${deliveryLine(input)}
Total paid: ${formatPHP(input.totalCentavos)}${input.discountCentavos > 0 ? `\nYou saved: ${formatPHP(input.discountCentavos)}` : ""}

${input.fulfillmentMethod === "PICKUP" ? "Pickup details will follow in a separate email." : "Track your delivery via your courier updates."}

— Le Sillage Manila`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "Your order has shipped",
    greeting: greeting(input),
    intro: [
      `Order ${input.orderNumber} is on its way. We will message you again when it is marked delivered.`,
      input.fulfillmentMethod === "PICKUP"
        ? "Pickup details will follow in a separate email."
        : "Track your delivery via your courier updates.",
    ],
    items: input.lines,
    totals: orderTotals(input, "Total paid"),
    cta: { label: "View your order", url: accountOrdersUrl() },
  });
  return { subject, text, html };
}

export function orderDeliveredEmail(input: OrderEmailInput): OrderEmail {
  const subject = `Delivered — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

Order ${input.orderNumber} has been marked delivered. We hope it arrived in perfect condition.

Items:
${input.lines.map(formatLineForEmail).join("\n")}

Subtotal: ${formatPHP(input.subtotalCentavos)}
Delivery: ${deliveryLine(input)}
Total paid: ${formatPHP(input.totalCentavos)}${input.discountCentavos > 0 ? `\nYou saved: ${formatPHP(input.discountCentavos)}` : ""}

Once you've had a chance to check it over, you can mark it received any time from Account → Orders. If we don't hear from you, we'll check in by email in a couple of days.

— Le Sillage Manila`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "Delivered",
    greeting: greeting(input),
    intro: [`Order ${input.orderNumber} has been marked delivered. We hope it arrived in perfect condition.`],
    items: input.lines,
    totals: orderTotals(input, "Total paid"),
    cta: { label: "Mark as received", url: accountOrdersUrl() },
    outro: [
      "Once you've had a chance to check it over, you can mark it received any time from Account → Orders. If we don't hear from you, we'll check in by email in a couple of days.",
    ],
  });
  return { subject, text, html };
}

export function orderReadyForPickupEmail(input: OrderEmailInput): OrderEmail {
  const subject = `Ready for pickup — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

Order ${input.orderNumber} is ready for you to collect.

Items:
${input.lines.map(formatLineForEmail).join("\n")}

Subtotal: ${formatPHP(input.subtotalCentavos)}
Delivery: ${deliveryLine(input)}
Total paid: ${formatPHP(input.totalCentavos)}${input.discountCentavos > 0 ? `\nYou saved: ${formatPHP(input.discountCentavos)}` : ""}
${pickupTextBlock(input)}
— Le Sillage Manila`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "Ready for pickup",
    greeting: greeting(input),
    intro: [`Order ${input.orderNumber} is ready for you to collect.`],
    facts: pickupFact(input),
    items: input.lines,
    totals: orderTotals(input, "Total paid"),
    cta: { label: "View your order", url: accountOrdersUrl() },
  });
  return { subject, text, html };
}

export function deliveryFollowupEmail(input: OrderEmailInput): OrderEmail {
  const subject = `Did your order arrive OK? — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

A couple of days ago we marked order ${input.orderNumber} as delivered. Did it reach you safely?

Yes, I received it: ${input.deliveryConfirmUrl}

Not received it, or something's wrong? Visit ${input.contactUrl} or reply to this email and we'll sort it out.

If we don't hear back, we'll mark this order complete automatically after three days from delivery.

— Le Sillage Manila`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "Did your order arrive OK?",
    greeting: greeting(input),
    intro: [`A couple of days ago we marked order ${input.orderNumber} as delivered. Did it reach you safely?`],
    items: input.lines,
    cta: input.deliveryConfirmUrl ? { label: "Yes, I received it", url: input.deliveryConfirmUrl } : undefined,
    outro: [
      `Not received it, or something's wrong? Visit ${input.contactUrl ?? `${siteUrl()}/contact`} or reply to this email and we'll sort it out.`,
    ],
    footnote: "If we don't hear back, we'll mark this order complete automatically after three days from delivery.",
  });
  return { subject, text, html };
}

export function adminReceiptNotification(input: OrderEmailInput): OrderEmail {
  const subject = `New receipt — ${input.orderNumber}`;
  const text = `Order ${input.orderNumber} for ${input.recipientName} (${input.email}) has submitted a receipt.

Total: ${formatPHP(input.totalCentavos)}
Method: ${input.fulfillmentMethod}
Items:
${input.lines.map(formatLineForEmail).join("\n")}
— Le Sillage Manila admin`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "New receipt to verify",
    greeting: "Hi team,",
    intro: [`${input.recipientName} (${input.email}) has submitted a receipt for order ${input.orderNumber}.`],
    facts: [
      { label: "Method", value: input.fulfillmentMethod === "PICKUP" ? "Pickup" : "Delivery" },
      ...pickupFact(input),
    ],
    items: input.lines,
    totals: orderTotals(input, "Total paid"),
    cta: { label: "Open admin orders", url: `${siteUrl()}/admin/orders` },
  });
  return { subject, text, html };
}

function brandedCodeEmail(args: {
  subject: string;
  greeting: string;
  body: string;
  code: string;
}): { subject: string; text: string; html: string } {
  const spaced = args.code.split("").join(" ");
  const text = `Hi,

${args.body}

Your code: ${args.code}

It expires in 10 minutes. If you did not request this, you can ignore this email.

— Le Sillage Manila`;
  const html = `<div style="font-family:Georgia,serif;background:#f7f3ea;padding:32px;color:#2b241c">
  <p style="letter-spacing:0.3em;text-transform:uppercase;font-size:12px;color:#b0893d">Le Sillage Manila</p>
  <h1 style="font-size:22px">${args.subject}</h1>
  <p>${args.body}</p>
  <p style="font-size:32px;letter-spacing:0.4em;font-weight:700;margin:24px 0">${spaced}</p>
  <p style="font-size:13px;color:#6b645c">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
</div>`;
  return { subject: args.subject, text, html };
}

export function confirmSignupEmail(code: string): { subject: string; text: string; html: string } {
  return brandedCodeEmail({
    subject: "Confirm your Le Sillage Manila account",
    greeting: "Welcome",
    body: "Use this 6-digit code to verify your email and finish creating your account.",
    code,
  });
}

export function resetPasswordEmail(code: string): { subject: string; text: string; html: string } {
  return brandedCodeEmail({
    subject: "Reset your Le Sillage Manila password",
    greeting: "Hello",
    body: "Use this 6-digit code to choose a new password.",
    code,
  });
}

export function changeEmailEmail(code: string): { subject: string; text: string; html: string } {
  return brandedCodeEmail({
    subject: "Confirm your new email",
    greeting: "Hello",
    body: "Use this 6-digit code to confirm the new email address on your Le Sillage Manila account.",
    code,
  });
}

export function reauthEmail(code: string): { subject: string; text: string; html: string } {
  return brandedCodeEmail({
    subject: "Confirm a sensitive change",
    greeting: "Hello",
    body: "Use this 6-digit code to confirm a password change or account deletion.",
    code,
  });
}

export function securityNoticeEmail(args: {
  subject: string;
  body: string;
}): { subject: string; text: string } {
  return {
    subject: args.subject,
    text: `Hi,

${args.body}

If this was not you, reply to this email immediately.

— Le Sillage Manila`,
  };
}

export function orderCreatedPaymentEmail(input: OrderEmailInput): OrderEmail {
  const subject = `Pay for order ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

Your order ${input.orderNumber} is waiting for payment.

Total to pay: ${formatPHP(input.totalCentavos)}
Items:
${input.lines.map(formatLineForEmail).join("\n")}
Delivery: ${deliveryLine(input)}

Open your payment page, send the amount via the QR code, then upload your receipt. Stock is reserved when we receive that receipt.

— Le Sillage Manila`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "Your order is in — one step left",
    greeting: greeting(input),
    intro: [`Your order ${input.orderNumber} is waiting for payment.`],
    facts: [{ label: "Status", value: describeStatus(input.status) }, ...pickupFact(input)],
    items: input.lines,
    totals: orderTotals(input, "Total to pay"),
    cta: { label: "Pay now", url: input.payUrl ?? paymentPageUrl(input.orderNumber) },
    outro: [
      "Open your payment page, send the amount via the QR code, then upload your receipt. Stock is reserved when we receive that receipt.",
    ],
  });
  return { subject, text, html };
}

export function paymentReminderEmail(input: OrderEmailInput): OrderEmail {
  const payLine = input.payUrl ? `\nPay here (sign in if asked): ${input.payUrl}\n` : "";
  const subject = `Your order is one QR away — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

Order ${input.orderNumber} is still sitting pretty on our shelf, tapping a tiny glass foot. The only thing between you and that trail is payment — nothing else.

Send ${formatPHP(input.totalCentavos)} via the QR on your payment page, then upload the receipt. We'll take it from there (and stop writing fan mail to an unpaid bottle).

If you'd rather let this one go, cancel it from your account. No hard feelings — even perfume needs space sometimes.
${payLine}
— Le Sillage Manila`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "Your order is one QR away",
    greeting: greeting(input),
    intro: [
      `Order ${input.orderNumber} is still sitting pretty on our shelf, tapping a tiny glass foot. The only thing between you and that trail is payment — nothing else.`,
      `Send ${formatPHP(input.totalCentavos)} via the QR on your payment page, then upload the receipt. We'll take it from there (and stop writing fan mail to an unpaid bottle).`,
    ],
    items: input.lines,
    totals: [{ label: "Total to pay", value: formatPHP(input.totalCentavos), strong: true }],
    cta: { label: "Pay now", url: input.payUrl ?? paymentPageUrl(input.orderNumber) },
    outro: ["If you'd rather let this one go, cancel it from your account. No hard feelings — even perfume needs space sometimes."],
    footnote: "Sign in if asked — the payment page is tied to your account.",
  });
  return { subject, text, html };
}

export function orderCancelledEmail(input: OrderEmailInput): OrderEmail {
  const reason = input.reason?.trim() ? `\nReason: ${input.reason.trim()}\n` : "";
  const subject = `Order cancelled — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

We've cancelled order ${input.orderNumber}. Nothing's reserved, nothing's charged — the bottle goes back on the shelf.
${reason}
If this wasn't you, reply to this email and we'll sort it out.

— Le Sillage Manila`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "Order cancelled",
    greeting: greeting(input),
    intro: [`We've cancelled order ${input.orderNumber}. Nothing's reserved, nothing's charged — the bottle goes back on the shelf.`],
    facts: input.reason?.trim() ? [{ label: "Reason", value: input.reason.trim() }] : undefined,
    items: input.lines,
    outro: ["If this wasn't you, reply to this email and we'll sort it out."],
  });
  return { subject, text, html };
}

// Once an order is CONFIRMED, a customer "cancel" only requests it — these
// three cover that request/review round trip (see customerCancelMode in
// src/domain/order-state.ts and requestOrderCancellation/
// resolveCancellationRequest in src/lib/orders.ts). An approved request just
// reuses orderCancelledEmail above via the normal CANCELLED transition.

export function cancellationRequestedEmail(input: OrderEmailInput): OrderEmail {
  const subject = `Cancellation request received — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

We received your request to cancel order ${input.orderNumber}. Your payment's already been verified, so we need to review it before it's cancelled — we'll email you as soon as it's resolved.

Your reason: ${input.reason ?? "Not provided"}

— Le Sillage Manila`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "Cancellation request received",
    greeting: greeting(input),
    intro: [
      `We received your request to cancel order ${input.orderNumber}. Your payment's already been verified, so we need to review it before it's cancelled — we'll email you as soon as it's resolved.`,
    ],
    facts: [{ label: "Your reason", value: input.reason ?? "Not provided" }],
    items: input.lines,
    cta: { label: "View your orders", url: accountOrdersUrl() },
  });
  return { subject, text, html };
}

export function adminCancellationRequestNotification(input: OrderEmailInput): OrderEmail {
  const subject = `Cancellation requested — ${input.orderNumber}`;
  const text = `${input.recipientName} (${input.email}) has requested to cancel order ${input.orderNumber}.

Reason: ${input.reason ?? "Not provided"}
Items:
${input.lines.map(formatLineForEmail).join("\n")}
— Le Sillage Manila admin`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "Cancellation requested",
    greeting: "Hi team,",
    intro: [`${input.recipientName} (${input.email}) has requested to cancel order ${input.orderNumber}.`],
    facts: [{ label: "Reason", value: input.reason ?? "Not provided" }],
    items: input.lines,
    cta: { label: "Open admin orders", url: `${siteUrl()}/admin/orders` },
  });
  return { subject, text, html };
}

export function cancellationRequestDeniedEmail(input: OrderEmailInput): OrderEmail {
  const subject = `About your cancellation request — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

We looked into your request to cancel order ${input.orderNumber}, but we're not able to cancel it at this stage.

If you have questions, just reply to this email and we'll help sort it out.

— Le Sillage Manila`;
  const html = renderOrderEmailHtml({
    siteUrl: siteUrl(),
    eyebrow: eyebrow(input),
    title: "About your cancellation request",
    greeting: greeting(input),
    intro: [`We looked into your request to cancel order ${input.orderNumber}, but we're not able to cancel it at this stage.`],
    items: input.lines,
    cta: { label: "View your orders", url: accountOrdersUrl() },
    outro: ["If you have questions, just reply to this email and we'll help sort it out."],
  });
  return { subject, text, html };
}

