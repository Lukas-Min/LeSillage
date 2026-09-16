import { and, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, users } from "@/db/schema";
import { ARCHIVE_DELETE_AFTER_MS, ARCHIVE_SWEEP_BATCH, isDueForArchiveDelete } from "@/domain/archive";
import { isTerminal } from "@/domain/order-state";
import { eraseUserAccount } from "@/lib/account";
import { auditLogSubject } from "@/lib/audit";

export interface ArchiveSweepRunResult {
  deleted: number;
  skipped: number;
  failed: number;
}

export async function sweepArchivedAccounts(now = new Date()): Promise<ArchiveSweepRunResult> {
  const client = db();
  const cutoff = new Date(now.getTime() - ARCHIVE_DELETE_AFTER_MS);
  // lte() against the nullable archivedAt column already excludes
  // never-archived users: NULL <= cutoff evaluates to NULL, not true.
  const candidates = await client
    .select({ id: users.id, archivedAt: users.archivedAt })
    .from(users)
    .where(and(isNull(users.deletedAt), lte(users.archivedAt, cutoff)))
    .limit(ARCHIVE_SWEEP_BATCH);

  const result: ArchiveSweepRunResult = { deleted: 0, skipped: 0, failed: 0 };

  for (const candidate of candidates) {
    if (!isDueForArchiveDelete({ archivedAt: candidate.archivedAt, now })) {
      result.skipped += 1;
      continue;
    }

    // No interactive user to resolve an open order at sweep time — leave
    // the account archived and retry on a later run instead of force-closing
    // real business (an order still in flight).
    const openOrders = await client.select({ status: orders.status }).from(orders).where(eq(orders.userId, candidate.id));
    if (openOrders.some((order) => !isTerminal(order.status))) {
      result.skipped += 1;
      continue;
    }

    try {
      await eraseUserAccount(candidate.id);
      await auditLogSubject({
        actor: "system",
        action: "ACCOUNT_DELETE",
        targetType: "user",
        targetId: candidate.id,
      });
      result.deleted += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}
