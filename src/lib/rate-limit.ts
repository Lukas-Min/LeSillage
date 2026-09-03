import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db/client";
import { rateLimits, type RateLimitBucket } from "@/db/schema";

export interface RateLimitOptions {
  bucket: RateLimitBucket;
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
}

export async function rateLimit({
  bucket,
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitDecision> {
  const client = db();
  const windowStart = new Date(Date.now() - windowMs);

  // One lookup instead of a separate cleanup DELETE plus a windowed SELECT —
  // a stale row (older than the window) is just reset in place below rather
  // than deleted first, cutting this from 3 round trips to 2 on every call
  // (this runs on every add-to-cart and checkout attempt).
  const existing = await client
    .select()
    .from(rateLimits)
    .where(and(eq(rateLimits.bucket, bucket), eq(rateLimits.key, key)));
  const row = existing[0];

  if (!row || row.windowStart < windowStart) {
    // onConflictDoUpdate guards the race where a concurrent request for the
    // same bucket/key inserts between the select above and this write —
    // the original code's plain insert had no such guard.
    await client
      .insert(rateLimits)
      .values({ bucket, key, count: 1, windowStart: new Date() })
      .onConflictDoUpdate({
        target: [rateLimits.bucket, rateLimits.key],
        set: { count: 1, windowStart: new Date() },
      });
    return { allowed: true, remaining: limit - 1 };
  }
  if (row.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  await client
    .update(rateLimits)
    .set({ count: row.count + 1 })
    .where(eq(rateLimits.id, row.id));
  return { allowed: true, remaining: Math.max(0, limit - (row.count + 1)) };
}

export async function getRequestKey(prefix: string, scope?: string): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = h.get("x-real-ip");
  const ip = fwd || real || "unknown";
  const subject = scope ? `${scope}:${ip}` : ip;
  return `${prefix}:${subject}`;
}

export type { RateLimitBucket };
