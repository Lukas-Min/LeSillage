import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db/client";
import { type RateLimitBucket } from "@/db/schema";

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
  const row = await client.execute<{
    count: number | string;
    window_start: Date | string;
  }>(
    sql`
      INSERT INTO rate_limit ("bucket", "key", "count", "windowStart")
      VALUES (${bucket}, ${key}, 1, NOW())
      ON CONFLICT ("bucket", "key") DO UPDATE
        SET
          "count" = CASE
            WHEN rate_limit."windowStart" < NOW() - (${windowMs} * INTERVAL '1 millisecond')
              THEN 1
            ELSE rate_limit."count" + 1
          END,
          "windowStart" = CASE
            WHEN rate_limit."windowStart" < NOW() - (${windowMs} * INTERVAL '1 millisecond')
              THEN NOW()
            ELSE rate_limit."windowStart"
          END
      RETURNING "count"::int AS count, "windowStart" AS window_start
    `,
  );
  const next = Number(row.rows[0]?.count ?? 1);
  return {
    allowed: next <= limit,
    remaining: Math.max(0, limit - next),
  };
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
