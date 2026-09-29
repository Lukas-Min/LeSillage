import { and, asc, eq, inArray, lt, or } from "drizzle-orm";
import { db } from "@/db/client";
import { marketingEmails, notificationLog } from "@/db/schema";
import { MARKETING_EMAILS_PER_RUN, MARKETING_SEND_STALE_MS } from "@/domain/marketing";
import { sendEmail } from "@/lib/email";
import { listUnsubscribeHeaders } from "@/lib/email-links";
import { loadMarketingRecipients } from "@/lib/marketing-recipients";

export interface QueuedMarketingEmail {
  recipient: string;
  /** notification_log template name, e.g. "site_wide_discount_broadcast". */
  template: string;
  subject: string;
  text: string;
  html: string;
}

export async function enqueueMarketingEmails(emails: readonly QueuedMarketingEmail[]): Promise<void> {
  for (let start = 0; start < emails.length; start += 500) {
    await db()
      .insert(marketingEmails)
      .values(emails.slice(start, start + 500).map((email) => ({ ...email, recipient: email.recipient.toLowerCase() })));
  }
}

export interface MarketingQueueRunResult {
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Sends the next batch of queued marketing email. Rows are claimed with
 * FOR UPDATE SKIP LOCKED, so the hourly Worker run, Vercel's daily fallback
 * and a post-save run can overlap without sending anything twice; a row left
 * SENDING by a crashed run is picked up again after MARKETING_SEND_STALE_MS.
 * Anyone who unsubscribed after the email was queued is skipped.
 */
export async function drainMarketingQueue(
  limit: number = MARKETING_EMAILS_PER_RUN,
  now: Date = new Date(),
): Promise<MarketingQueueRunResult> {
  const client = db();
  const stale = new Date(now.getTime() - MARKETING_SEND_STALE_MS);
  const claimed = await client.transaction(async (tx) => {
    const next = await tx
      .select({ id: marketingEmails.id })
      .from(marketingEmails)
      .where(
        or(
          eq(marketingEmails.status, "PENDING"),
          and(eq(marketingEmails.status, "SENDING"), lt(marketingEmails.claimedAt, stale)),
        ),
      )
      .orderBy(asc(marketingEmails.createdAt))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (next.length === 0) return [];
    return tx
      .update(marketingEmails)
      .set({ status: "SENDING", claimedAt: now })
      .where(
        inArray(
          marketingEmails.id,
          next.map((row) => row.id),
        ),
      )
      .returning();
  });

  const result: MarketingQueueRunResult = { sent: 0, failed: 0, skipped: 0 };
  if (claimed.length === 0) return result;

  const subscribed = new Set((await loadMarketingRecipients()).map((recipient) => recipient.email));
  for (const email of claimed) {
    if (!subscribed.has(email.recipient)) {
      await client
        .update(marketingEmails)
        .set({ status: "SKIPPED", error: "No longer subscribed" })
        .where(eq(marketingEmails.id, email.id));
      result.skipped += 1;
      continue;
    }
    const sent = await sendEmail({
      to: email.recipient,
      subject: email.subject,
      text: email.text,
      html: email.html,
      headers: listUnsubscribeHeaders(email.recipient),
    });
    await client
      .update(marketingEmails)
      .set(
        sent.ok
          ? { status: "SENT", sentAt: new Date(), error: null }
          : { status: "FAILED", error: sent.error ?? "unknown" },
      )
      .where(eq(marketingEmails.id, email.id));
    await client.insert(notificationLog).values({
      recipient: email.recipient,
      template: email.template,
      status: sent.ok ? "SENT" : "FAILED",
      error: sent.ok ? null : sent.error ?? "unknown",
    });
    if (sent.ok) result.sent += 1;
    else result.failed += 1;
  }
  return result;
}
