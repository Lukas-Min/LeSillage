const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "invalid-credentials": "Incorrect email or password.",
  "account-deleted": "This account has been closed. Contact support if this is a mistake.",
  "oauth-only": "This email uses Google or Facebook sign-in. Continue with one of those instead.",
  "unverified-email": "Please verify your email first.",
  // NextAuth's own OAuth error codes, reachable via a real signIn() redirect today.
  OAuthAccountNotLinked: "That email is already used by another sign-in method.",
  AccessDenied: "Access denied. Please try again.",
  Configuration: "Sign-in is temporarily unavailable. Please try again shortly.",
  default: "Something went wrong. Please try again.",
};

/**
 * Resolves a `?error=` (+ optional `?msg=` for free-text server-action
 * errors, see auth-credentials-actions.ts) query param pair into copy for
 * the auth forms. Returns null when there's nothing to show.
 */
export function authErrorMessage(code?: string | null, msg?: string | null): string | null {
  if (!code) return null;
  if (code === "message") return msg ? decodeURIComponent(msg) : AUTH_ERROR_MESSAGES.default;
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.default;
}
