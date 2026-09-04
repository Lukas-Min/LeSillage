import { and, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { notificationLog, orderItems, orders } from "@/db/schema";
import {
  isDueForPaymentReminder,
  PAYMENT_REMINDER_AFTER_MS,
  PAYMENT_REMINDER_BATCH,
} from "@/domain/payment-reminder";
import { sendEmail } from "@/lib/email";
import { paymentReminderEmail } from "@/lib/email-templates";
import { getEnv } from "@/lib/env";

export interface PaymentReminderRunResult {
  sent: number;
  failed: number;
  skipped: number;
}

function payUrl(orderNumber: string): string {
  const base = getEnv().APP_URL.replace(/\/$/, "");
  return `${base}/checkout/payment?orderNumber=${encodeURIComponent(orderNumber)}`;
}

export async function sendDuePaymentReminders(now = new Date()): Promise<PaymentReminderRunResult> {
  const client = db();
  const cutoff = new Date(now.getTime() - PAYMENT_REMINDER_AFTER_MS);
  const candidates = await client
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "AWAITING_PAYMENT"),
        isNull(orders.paymentReminderSentAt),
        lte(orders.statusUpdatedAt, cutoff),
      ),
    )
    .limit(PAYMENT_REMINDER_BATCH);

  const result: PaymentReminderRunResult = { sent: 0, failed: 0, skipped: 0 };

  for (const order of candidates) {
    if (
      !isDueForPaymentReminder({
        status: order.status,
        statusUpdatedAt: order.statusUpdatedAt,
        paymentReminderSentAt: order.paymentReminderSentAt,
        now,
      })
    ) {
      result.skipped += 1;
      continue;
    }

    const claimed = await client
      .update(orders)
      .set({ paymentReminderSentAt: now, updatedAt: now })
      .where(
        and(
          eq(orders.id, order.id),
          eq(orders.status, "AWAITING_PAYMENT"),
          isNull(orders.paymentReminderSentAt),
        ),
      )
      .returning({ id: orders.id });
    if (claimed.length === 0) {
      result.skipped += 1;
      continue;
    }

    const items = await client.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const sent = await sendEmail({
      to: order.email,
      ...paymentReminderEmail({
        orderNumber: order.orderNumber,
        status: "AWAITING_PAYMENT",
        recipientName: order.recipientName,
        email: order.email,
        fulfillmentMethod: order.fulfillmentMethod,
        lines: items.map((it) => ({
          productName: it.productName,
          skuLabel: it.skuLabel,
          quantity: it.quantity,
          originalUnitCentavos: it.originalUnitCentavos,
          unitPriceCentavos: it.unitPriceCentavos,
          discountCentavos: it.discountCentavos,
          lineTotalCentavos: it.lineTotalCentavos,
          productType: it.productType,
          fulfillment: it.fulfillment,
        })),
        subtotalCentavos: order.subtotalCentavos,
        discountCentavos: order.discountCentavos,
        deliveryFeeCentavos: order.deliveryFeeCentavos,
        totalCentavos: order.totalCentavos,
        orderedAt: order.createdAt,
        pickupNotes: order.pickupNotes,
        payUrl: payUrl(order.orderNumber),
      }),
    });

    await client.insert(notificationLog).values({
      orderId: order.id,
      recipient: order.email,
      template: "payment_reminder",
      status: sent.ok ? "SENT" : "FAILED",
      error: sent.ok ? null : sent.error ?? "unknown error",
    });

    if (sent.ok) {
      result.sent += 1;
    } else {
      await client
        .update(orders)
        .set({ paymentReminderSentAt: null, updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      result.failed += 1;
    }
  }

  return result;
}
