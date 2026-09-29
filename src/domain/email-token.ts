import { createHmac, timingSafeEqual } from "node:crypto";

/** What a signed email link is allowed to do. Part of the signature, so an
 *  unsubscribe token can't be replayed as a confirm token or the reverse. */
export type EmailTokenPurpose = "unsubscribe" | "newsletter-confirm";

/**
 * A stateless token for a link in an email: HMAC-SHA256 of the purpose and
 * the lowercased address. Nothing is stored, and a token only proves the
 * holder received mail at that address. Unsubscribe links must keep working
 * in old emails, so tokens don't expire.
 */
export function signEmailToken(secret: string, purpose: EmailTokenPurpose, email: string): string {
  return createHmac("sha256", secret).update(`${purpose}:${email.trim().toLowerCase()}`).digest("base64url");
}

export function verifyEmailToken(secret: string, purpose: EmailTokenPurpose, email: string, token: string): boolean {
  const expected = Buffer.from(signEmailToken(secret, purpose, email));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
