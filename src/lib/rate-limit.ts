import { sql } from "drizzle-orm";
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
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  // One round trip: insert the row, or — if it already exists — reset it
  // when its window has expired, otherwise bump it, and read the resulting
  // count back. This runs before every mutation in the app (add-to-cart,
  // checkout, receipt upload…); it used to be a SELECT followed by an
  // INSERT/UPDATE, two sequential round trips, with a select-then-write
  // race between them that the single ON CONFLICT statement closes.
  // sql.param(…, column) routes the Dates through the column's driver mapping —
  // a bare Date inside a sql template is handed to postgres.js raw, which
  // rejects it.
  const stale = sql`${rateLimits.windowStart} < ${sql.param(windowStart, rateLimits.windowStart)}`;
  const [row] = await db()
    .insert(rateLimits)
    .values({ bucket, key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: [rateLimits.bucket, rateLimits.key],
      set: {
        count: sql`CASE WHEN ${stale} THEN 1 ELSE ${rateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${stale} THEN ${sql.param(now, rateLimits.windowStart)} ELSE ${rateLimits.windowStart} END`,
      },
    })
    .returning({ count: rateLimits.count });

  // The counter keeps climbing past the cap while the window is open, so a
  // client that keeps hammering extends its own penalty. Clamping keeps the
  // reported `remaining` identical to what the two-step version returned.
  const count = row?.count ?? 1;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
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
