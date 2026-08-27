import { and, eq, gte, lt } from "drizzle-orm";
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

  await client
    .delete(rateLimits)
    .where(
      and(
        eq(rateLimits.bucket, bucket),
        eq(rateLimits.key, key),
        lt(rateLimits.windowStart, windowStart),
      ),
    );

  const existing = await client
    .select()
    .from(rateLimits)
    .where(and(eq(rateLimits.bucket, bucket), eq(rateLimits.key, key), gte(rateLimits.windowStart, windowStart)));

  const row = existing[0];
  if (!row) {
    await client.insert(rateLimits).values({ bucket, key, count: 1, windowStart: new Date() });
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
