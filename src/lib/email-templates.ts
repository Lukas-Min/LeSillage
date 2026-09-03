import { describeStatus } from "@/domain/order-state";
import { computeEtaSummary } from "@/domain/eta";
import { formatPHP } from "@/domain/money";
import type { Fulfillment, OrderStatus, ProductType } from "@/db/schema";

interface EmailLine {
  productName: string;
  skuLabel: string;
  quantity: number;
  originalUnitCentavos?: number;
  unitPriceCentavos: number;
  lineTotalCentavos: number;
  discountCentavos?: number;
  productType: ProductType;
  fulfillment: Fulfillment;
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
}

function etaLinesSummary(lines: EmailLine[], orderedAt: Date): string {
  const ranges = computeEtaSummary(lines.map((line) => ({ fulfillment: line.fulfillment, orderedAt })));
  if (ranges.length === 0) return "No items in this order.";
  return ranges.map((r) => r.label).join(" · ");
}

function formatLineForEmail(line: EmailLine): string {
  const saving = line.discountCentavos ?? 0;
  if (saving > 0 && line.originalUnitCentavos && line.originalUnitCentavos > line.unitPriceCentavos) {
    return `- ${line.productName} (${line.skuLabel}) × ${line.quantity} — ~~${formatPHP(line.originalUnitCentavos)}~~ ${formatPHP(line.unitPriceCentavos * line.quantity)} (saved ${formatPHP(saving * line.quantity)})`;
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

export function receiptSubmittedEmail(input: OrderEmailInput): { subject: string; text: string } {
  const eta = etaLinesSummary(input.lines, input.orderedAt);
  const tester = input.testerAwarded ? `\nFree tester: ${input.testerAwarded.name}\n` : "";
  const subject = `We received your receipt — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

Thank you for your order with Le Sillage. We received your payment receipt and will verify it shortly.

Order: ${input.orderNumber}
Status: ${describeStatus(input.status)}

Items:
${input.lines.map(formatLineForEmail).join("\n")}

Subtotal: ${formatPHP(input.subtotalCentavos)}
Delivery: ${deliveryLine(input)}
Total paid: ${formatPHP(input.totalCentavos)}${input.discountCentavos > 0 ? `\nYou saved: ${formatPHP(input.discountCentavos)}` : ""}

Estimated arrival: ${eta}
${tester}
${input.fulfillmentMethod === "PICKUP" ? `\nPickup notes: ${input.pickupNotes ?? "TBD"}\n` : ""}
If anything looks off, reply to this email and we will sort it out.

— Le Sillage`;
  return { subject, text };
}

export function receiptRejectedEmail(input: OrderEmailInput): { subject: string; text: string } {
  const subject = `Receipt needs another look — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

We could not verify the payment receipt for order ${input.orderNumber}.

Reason: ${input.reason ?? "Not provided"}

You can upload a new receipt from your account page. If you believe this is a mistake, reply to this email.

— Le Sillage`;
  return { subject, text };
}

export function orderConfirmedEmail(input: OrderEmailInput): { subject: string; text: string } {
  const eta = etaLinesSummary(input.lines, input.orderedAt);
  const subject = `Payment verified — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

We verified your payment for order ${input.orderNumber}. We are preparing it now.

Estimated arrival: ${eta}
${input.fulfillmentMethod === "PICKUP" ? `\nPickup notes: ${input.pickupNotes ?? "TBD"}\n` : ""}
— Le Sillage`;
  return { subject, text };
}

export function orderShippedEmail(input: OrderEmailInput): { subject: string; text: string } {
  const subject = `Your order has shipped — ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

Order ${input.orderNumber} is on its way. We will message you again when it is marked delivered.

${input.fulfillmentMethod === "PICKUP" ? "Pickup details will follow in a separate email." : "Track your delivery via your courier updates."}

— Le Sillage`;
  return { subject, text };
}

export function adminReceiptNotification(input: OrderEmailInput): { subject: string; text: string } {
  const subject = `New receipt — ${input.orderNumber}`;
  const text = `Order ${input.orderNumber} for ${input.recipientName} (${input.email}) has submitted a receipt.

Total: ${formatPHP(input.totalCentavos)}
Method: ${input.fulfillmentMethod}
Items:
${input.lines.map(formatLineForEmail).join("\n")}
— Le Sillage admin`;
  return { subject, text };
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

— Le Sillage`;
  const html = `<div style="font-family:Georgia,serif;background:#f7f3ea;padding:32px;color:#2b241c">
  <p style="letter-spacing:0.3em;text-transform:uppercase;font-size:12px;color:#b0893d">Le Sillage</p>
  <h1 style="font-size:22px">${args.subject}</h1>
  <p>${args.body}</p>
  <p style="font-size:32px;letter-spacing:0.4em;font-weight:700;margin:24px 0">${spaced}</p>
  <p style="font-size:13px;color:#6b645c">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
</div>`;
  return { subject: args.subject, text, html };
}

export function confirmSignupEmail(code: string): { subject: string; text: string; html: string } {
  return brandedCodeEmail({
    subject: "Confirm your Le Sillage account",
    greeting: "Welcome",
    body: "Use this 6-digit code to verify your email and finish creating your account.",
    code,
  });
}

export function resetPasswordEmail(code: string): { subject: string; text: string; html: string } {
  return brandedCodeEmail({
    subject: "Reset your Le Sillage password",
    greeting: "Hello",
    body: "Use this 6-digit code to choose a new password.",
    code,
  });
}

export function changeEmailEmail(code: string): { subject: string; text: string; html: string } {
  return brandedCodeEmail({
    subject: "Confirm your new email",
    greeting: "Hello",
    body: "Use this 6-digit code to confirm the new email address on your Le Sillage account.",
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

— Le Sillage`,
  };
}

export function orderCreatedPaymentEmail(input: OrderEmailInput): { subject: string; text: string } {
  const subject = `Pay for order ${input.orderNumber}`;
  const text = `Hi ${input.recipientName},

Your order ${input.orderNumber} is waiting for payment.

Total to pay: ${formatPHP(input.totalCentavos)}
Items:
${input.lines.map(formatLineForEmail).join("\n")}
Delivery: ${deliveryLine(input)}

Open your payment page, send the amount via the QR code, then upload your receipt. Stock is reserved when we receive that receipt.

— Le Sillage`;
  return { subject, text };
}

