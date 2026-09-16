import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import {
  DELIVERY_AUTO_COMPLETE_AFTER_MS,
  DELIVERY_AUTO_COMPLETE_BATCH,
  isDueForDeliveryAutoComplete,
} from "@/domain/delivery-auto-complete";
import { transitionOrderStatus } from "@/lib/orders";

export interface DeliveryAutoCompleteRunResult {
  completed: number;
  failed: number;
  skipped: number;
}

export async function autoCompleteDeliveredOrders(now = new Date()): Promise<DeliveryAutoCompleteRunResult> {
  const client = db();
  const cutoff = new Date(now.getTime() - DELIVERY_AUTO_COMPLETE_AFTER_MS);
  const candidates = await client
    .select({ id: orders.id, status: orders.status, statusUpdatedAt: orders.statusUpdatedAt })
    .from(orders)
    .where(and(eq(orders.status, "DELIVERED"), lte(orders.statusUpdatedAt, cutoff)))
    .limit(DELIVERY_AUTO_COMPLETE_BATCH);

  const result: DeliveryAutoCompleteRunResult = { completed: 0, failed: 0, skipped: 0 };

  for (const order of candidates) {
    if (!isDueForDeliveryAutoComplete({ status: order.status, statusUpdatedAt: order.statusUpdatedAt, now })) {
      result.skipped += 1;
      continue;
    }

    try {
      await transitionOrderStatus({ orderId: order.id, next: "COMPLETED" });
      result.completed += 1;
    } catch {
      // Another process may have already moved this order (e.g. the
      // customer just clicked the day-2 email's link) — leave it and move
      // on rather than failing the whole batch over one order.
      result.failed += 1;
    }
  }

  return result;
}
