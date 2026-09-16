import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { AUTO_REJECT_AFTER_MS, AUTO_REJECT_BATCH, AUTO_REJECT_REASON, isDueForAutoReject } from "@/domain/auto-reject";
import { transitionOrderStatus } from "@/lib/orders";

export interface AutoRejectRunResult {
  cancelled: number;
  failed: number;
  skipped: number;
}

export async function autoRejectExpiredOrders(now = new Date()): Promise<AutoRejectRunResult> {
  const client = db();
  const cutoff = new Date(now.getTime() - AUTO_REJECT_AFTER_MS);
  const candidates = await client
    .select({ id: orders.id, status: orders.status, statusUpdatedAt: orders.statusUpdatedAt })
    .from(orders)
    .where(and(eq(orders.status, "AWAITING_PAYMENT"), lte(orders.statusUpdatedAt, cutoff)))
    .limit(AUTO_REJECT_BATCH);

  const result: AutoRejectRunResult = { cancelled: 0, failed: 0, skipped: 0 };

  for (const order of candidates) {
    if (!isDueForAutoReject({ status: order.status, statusUpdatedAt: order.statusUpdatedAt, now })) {
      result.skipped += 1;
      continue;
    }

    try {
      await transitionOrderStatus({ orderId: order.id, next: "CANCELLED", reason: AUTO_REJECT_REASON });
      result.cancelled += 1;
    } catch {
      // Another process may have already moved this order (e.g. the
      // customer just submitted a receipt) — leave it and move on rather
      // than failing the whole batch over one order.
      result.failed += 1;
    }
  }

  return result;
}
