import { signEmailToken, verifyEmailToken, type EmailTokenPurpose } from "@/domain/email-token";
import { getEnv } from "@/lib/env";

function linkFor(path: string, purpose: EmailTokenPurpose, email: string): string {
  const env = getEnv();
  const base = env.APP_URL.replace(/\/$/, "");
  const params = new URLSearchParams({ email, token: signEmailToken(env.AUTH_SECRET, purpose, email) });
  return `${base}${path}?${params.toString()}`;
}

/** The page behind the "Unsubscribe" link at the bottom of a marketing email. */
export function unsubscribePageUrl(email: string): string {
  return linkFor("/unsubscribe", "unsubscribe", email);
}

/** RFC 8058 one-click target for the List-Unsubscribe header (mail apps POST to it). */
export function unsubscribeOneClickUrl(email: string): string {
  return linkFor("/api/unsubscribe", "unsubscribe", email);
}

export function newsletterConfirmUrl(email: string): string {
  return linkFor("/newsletter/confirm", "newsletter-confirm", email);
}

export function isValidEmailLink(purpose: EmailTokenPurpose, email: string, token: string): boolean {
  if (!email || !token) return false;
  return verifyEmailToken(getEnv().AUTH_SECRET, purpose, email, token);
}

/** Headers that give Gmail and Apple Mail their own Unsubscribe button. */
export function listUnsubscribeHeaders(email: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeOneClickUrl(email)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
