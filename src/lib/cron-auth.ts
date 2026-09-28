import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Constant-time bearer check. Digests are always 32 bytes so a mismatch cannot leak the secret by timing. */
export function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return process.env.NODE_ENV !== "production";
  return timingSafeEqual(sha256(header), sha256(`Bearer ${secret}`));
}
