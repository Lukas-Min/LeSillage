import { and, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { notificationLog, orderItems, orders } from "@/db/schema";
import {
  isDueForPaymentReminder,
  PAYMENT_REMINDER_AFTER_MS,
  PAYMENT_REMINDER_BATCH,
} from "@/domain/payment-reminder";
import { paymentDeadline } from "@/domain/auto-reject";
import { sendEmail } from "@/lib/email";
import { toEmailLines } from "@/lib/order-email-lines";
import { paymentReminderEmail } from "@/lib/email-templates";
import { getEnv } from "@/lib/env";

export interface PaymentReminderRunResult {
  sent: number;
  failed: number;
  skipped: number;
}

type Client = ReturnType<typeof db>;
type OrderRow = typeof orders.$inferSelect;

function payUrl(orderNumber: string): string {
  const base = getEnv().APP_URL.replace(/\/$/, "");
  return `${base}/checkout/payment?orderNumber=${encodeURIComponent(orderNumber)}`;
}

async function claimAndSendReminder(
  client: Client,
  order: OrderRow,
  now: Date,
): Promise<"sent" | "failed" | "skipped"> {
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
  if (claimed.length === 0) return "skipped";

  const items = await client.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const sent = await sendEmail({
    to: order.email,
    ...paymentReminderEmail({
      orderNumber: order.orderNumber,
      status: "AWAITING_PAYMENT",
      recipientName: order.recipientName,
      email: order.email,
      fulfillmentMethod: order.fulfillmentMethod,
      lines: await toEmailLines(items, order),
      subtotalCentavos: order.subtotalCentavos,
      discountCentavos: order.discountCentavos,
      deliveryFeeCentavos: order.deliveryFeeCentavos,
      totalCentavos: order.totalCentavos,
      orderedAt: order.createdAt,
      pickupNotes: order.pickupNotes,
      payUrl: payUrl(order.orderNumber),
      payBy: paymentDeadline(order.statusUpdatedAt),
    }),
  });

  await client.insert(notificationLog).values({
    orderId: order.id,
    recipient: order.email,
    template: "payment_reminder",
    status: sent.ok ? "SENT" : "FAILED",
    error: sent.ok ? null : sent.error ?? "unknown error",
  });

  if (sent.ok) return "sent";

  await client
    .update(orders)
    .set({ paymentReminderSentAt: null, updatedAt: new Date() })
    .where(eq(orders.id, order.id));
  return "failed";
}

/** One order, used by the countdown when 30 minutes are left. Idempotent. */
export async function sendPaymentReminderForOrder(
  orderId: string,
  userId: string,
): Promise<"sent" | "skipped" | "failed" | "not-due"> {
  const client = db();
  const now = new Date();
  const order = (
    await client
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
  )[0];
  if (!order) return "skipped";
  if (order.status !== "AWAITING_PAYMENT" || order.paymentReminderSentAt) return "skipped";
  if (
    !isDueForPaymentReminder({
      status: order.status,
      statusUpdatedAt: order.statusUpdatedAt,
      paymentReminderSentAt: order.paymentReminderSentAt,
      now,
    })
  ) {
    return "not-due";
  }
  return claimAndSendReminder(client, order, now);
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

    const outcome = await claimAndSendReminder(client, order, now);
    if (outcome === "sent") result.sent += 1;
    else if (outcome === "failed") result.failed += 1;
    else result.skipped += 1;
  }

  return result;
}
