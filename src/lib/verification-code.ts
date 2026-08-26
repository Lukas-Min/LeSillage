import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  emailVerificationCodes,
  type EmailVerificationPurpose,
} from "@/db/schema";
import { getEnv } from "@/lib/env";

const EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

export function hashVerificationCode(code: string, identifier: string): string {
  const env = getEnv();
  return createHash("sha256").update(`${identifier}:${code}:${env.AUTH_SECRET}`).digest("hex");
}

export function generateNumericCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function issueVerificationCode(args: {
  identifier: string;
  purpose: EmailVerificationPurpose;
  metadata?: Record<string, unknown>;
}): Promise<{ code: string; resentTooSoon: boolean }> {
  const client = db();
  const identifier = args.identifier.trim().toLowerCase();
  const latest = (
    await client
      .select()
      .from(emailVerificationCodes)
      .where(
        and(
          eq(emailVerificationCodes.identifier, identifier),
          eq(emailVerificationCodes.purpose, args.purpose),
          isNull(emailVerificationCodes.consumedAt),
        ),
      )
      .orderBy(desc(emailVerificationCodes.createdAt))
      .limit(1)
  )[0];
  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { code: "", resentTooSoon: true };
  }
  const code = generateNumericCode();
  await client.insert(emailVerificationCodes).values({
    identifier,
    purpose: args.purpose,
    tokenHash: hashVerificationCode(code, identifier),
    expiresAt: new Date(Date.now() + EXPIRY_MS),
    metadata: args.metadata ?? null,
  });
  return { code, resentTooSoon: false };
}

export async function consumeVerificationCode(args: {
  identifier: string;
  purpose: EmailVerificationPurpose;
  code: string;
}): Promise<{ ok: boolean; error?: string; metadata?: Record<string, unknown> | null }> {
  const client = db();
  const identifier = args.identifier.trim().toLowerCase();
  const row = (
    await client
      .select()
      .from(emailVerificationCodes)
      .where(
        and(
          eq(emailVerificationCodes.identifier, identifier),
          eq(emailVerificationCodes.purpose, args.purpose),
          isNull(emailVerificationCodes.consumedAt),
          gt(emailVerificationCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(emailVerificationCodes.createdAt))
      .limit(1)
  )[0];
  if (!row) return { ok: false, error: "That code is invalid or expired" };
  if (row.attemptCount >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }
  const expected = hashVerificationCode(args.code.replace(/\D/g, ""), identifier);
  if (!hashesEqual(expected, row.tokenHash)) {
    await client
      .update(emailVerificationCodes)
      .set({ attemptCount: row.attemptCount + 1 })
      .where(eq(emailVerificationCodes.id, row.id));
    return { ok: false, error: "That code is invalid or expired" };
  }
  await client
    .update(emailVerificationCodes)
    .set({ consumedAt: new Date() })
    .where(eq(emailVerificationCodes.id, row.id));
  return { ok: true, metadata: (row.metadata as Record<string, unknown> | null) ?? null };
}
