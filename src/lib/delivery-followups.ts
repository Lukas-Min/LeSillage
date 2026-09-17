import { and, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { notificationLog, orderItems, orders } from "@/db/schema";
import {
  DELIVERY_FOLLOWUP_AFTER_MS,
  DELIVERY_FOLLOWUP_BATCH,
  isDueForDeliveryFollowup,
} from "@/domain/delivery-followup";
import { sendEmail } from "@/lib/email";
import { toEmailLines } from "@/lib/order-email-lines";
import { deliveryFollowupEmail } from "@/lib/email-templates";
import { getEnv } from "@/lib/env";

export interface DeliveryFollowupRunResult {
  sent: number;
  failed: number;
  skipped: number;
}

function confirmUrl(token: string): string {
  const base = getEnv().APP_URL.replace(/\/$/, "");
  return `${base}/order-confirm/${token}`;
}

function contactUrl(): string {
  const base = getEnv().APP_URL.replace(/\/$/, "");
  return `${base}/contact`;
}

export async function sendDueDeliveryFollowups(now = new Date()): Promise<DeliveryFollowupRunResult> {
  const client = db();
  const cutoff = new Date(now.getTime() - DELIVERY_FOLLOWUP_AFTER_MS);
  const candidates = await client
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "DELIVERED"),
        isNull(orders.deliveryFollowupSentAt),
        lte(orders.statusUpdatedAt, cutoff),
      ),
    )
    .limit(DELIVERY_FOLLOWUP_BATCH);

  const result: DeliveryFollowupRunResult = { sent: 0, failed: 0, skipped: 0 };

  for (const order of candidates) {
    if (
      !isDueForDeliveryFollowup({
        status: order.status,
        statusUpdatedAt: order.statusUpdatedAt,
        deliveryFollowupSentAt: order.deliveryFollowupSentAt,
        now,
      })
    ) {
      result.skipped += 1;
      continue;
    }

    // Same claim-then-send pattern as sendDuePaymentReminders: the
    // conditional UPDATE only succeeds for the process that gets there
    // first, so two overlapping cron runs can't both send this order's
    // follow-up.
    const claimed = await client
      .update(orders)
      .set({ deliveryFollowupSentAt: now, updatedAt: now })
      .where(
        and(
          eq(orders.id, order.id),
          eq(orders.status, "DELIVERED"),
          isNull(orders.deliveryFollowupSentAt),
        ),
      )
      .returning({ id: orders.id });
    if (claimed.length === 0) {
      result.skipped += 1;
      continue;
    }

    // transitionOrderStatus always mints a token on DELIVERED — this only
    // matters for an order that was already DELIVERED before this feature
    // shipped, which would have no token yet.
    let token = order.deliveryConfirmToken;
    if (!token) {
      token = crypto.randomUUID();
      await client.update(orders).set({ deliveryConfirmToken: token }).where(eq(orders.id, order.id));
    }

    const items = await client.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const sent = await sendEmail({
      to: order.email,
      ...deliveryFollowupEmail({
        orderNumber: order.orderNumber,
        status: "DELIVERED",
        recipientName: order.recipientName,
        email: order.email,
        fulfillmentMethod: order.fulfillmentMethod,
        lines: await toEmailLines(items),
        subtotalCentavos: order.subtotalCentavos,
        discountCentavos: order.discountCentavos,
        deliveryFeeCentavos: order.deliveryFeeCentavos,
        totalCentavos: order.totalCentavos,
        orderedAt: order.createdAt,
        pickupNotes: order.pickupNotes,
        deliveryConfirmUrl: confirmUrl(token),
        contactUrl: contactUrl(),
      }),
    });

    await client.insert(notificationLog).values({
      orderId: order.id,
      recipient: order.email,
      template: "delivery_followup",
      status: sent.ok ? "SENT" : "FAILED",
      error: sent.ok ? null : sent.error ?? "unknown error",
    });

    if (sent.ok) {
      result.sent += 1;
    } else {
      await client
        .update(orders)
        .set({ deliveryFollowupSentAt: null, updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      result.failed += 1;
    }
  }

  return result;
}
