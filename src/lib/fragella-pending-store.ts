import { and, eq, like, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { siteContent } from "@/db/schema";
import type { ParsedFragranticaPage } from "@/lib/fragrantica";

export interface ReviewPayload {
  parsed: ParsedFragranticaPage | null;
  query: string;
  fragranticaUrl: string | null;
}

const TTL_MS = 15 * 60 * 1000;
const PREFIX = "fragrantica-pending:";

// Kept in the database (the site_content key/value table), not in memory:
// the paste, the review page and the save are separate requests, and on
// Vercel each can land on a different server instance, where an in-memory
// map is empty — the review page then failed with "Something went wrong".
const pendingKey = (adminId: string, query: string) => `${PREFIX}${adminId}:${query.trim().toLowerCase()}`;

export async function persistPendingPayload(adminId: string, payload: ReviewPayload): Promise<void> {
  const client = db();
  const now = new Date();
  // Drop anyone's abandoned reviews while we're here.
  await client
    .delete(siteContent)
    .where(and(like(siteContent.key, `${PREFIX}%`), lt(siteContent.updatedAt, new Date(now.getTime() - TTL_MS))));
  const key = pendingKey(adminId, payload.query);
  const value = JSON.stringify(payload);
  await client
    .insert(siteContent)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({ target: siteContent.key, set: { value, updatedAt: now } });
}

export async function lookupPendingPayload(adminId: string, query: string): Promise<ReviewPayload | null> {
  const row = (
    await db()
      .select({ value: siteContent.value, updatedAt: siteContent.updatedAt })
      .from(siteContent)
      .where(eq(siteContent.key, pendingKey(adminId, query)))
  )[0];
  if (!row || Date.now() - row.updatedAt.getTime() > TTL_MS) return null;
  try {
    return JSON.parse(row.value) as ReviewPayload;
  } catch {
    return null;
  }
}

export async function clearPendingPayload(adminId: string, query: string): Promise<void> {
  await db().delete(siteContent).where(eq(siteContent.key, pendingKey(adminId, query)));
}
