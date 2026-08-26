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
Discount: ${formatPHP(input.discountCentavos)}
Delivery: ${deliveryLine(input)}
Total paid: ${formatPHP(input.totalCentavos)}

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
