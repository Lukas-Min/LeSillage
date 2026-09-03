"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { CredentialsSignin } from "next-auth";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { notificationLog, users } from "@/db/schema";
import { signIn } from "@/auth";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";
import { hashPassword, validatePassword } from "@/lib/password";
import { consumeVerificationCode, issueVerificationCode } from "@/lib/verification-code";
import { sendEmail } from "@/lib/email";
import {
  confirmSignupEmail,
  resetPasswordEmail,
  securityNoticeEmail,
} from "@/lib/email-templates";
import { getEnv } from "@/lib/env";
import { auditLogSubject } from "@/lib/audit";

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

/**
 * Turns a caught error into `?error=<code>[&msg=<text>]` for the page this
 * action redirects back to. `CredentialsSignin` (thrown by src/auth.ts's
 * authorize()) carries a fixed `.code` looked up by auth-errors.ts; any
 * other thrown Error (rate limiting, password/validation messages, bad
 * verification codes) passes its own message through directly as `msg`,
 * since those are already specific and human-readable at the throw site.
 */
function toRedirectQuery(error: unknown): string {
  if (error instanceof CredentialsSignin) return `error=${encodeURIComponent(error.code)}`;
  // ZodError.message is a JSON blob of issues — not something to show a
  // user; the form's own HTML validation should catch these first anyway.
  if (error instanceof z.ZodError) {
    return `error=message&msg=${encodeURIComponent("Please check your details and try again.")}`;
  }
  if (error instanceof Error) return `error=message&msg=${encodeURIComponent(error.message)}`;
  return "error=message";
}

/**
 * Shared shape for every auth action below: run `action`, and on a real
 * error (not a Next.js redirect/notFound control-flow signal — unstable_rethrow
 * lets those pass through untouched) redirect back to `fallback` with the
 * error encoded via toRedirectQuery. `action` itself may or may not redirect
 * on success (most do; resendSignupCode doesn't) — this wrapper only ever
 * intercepts the failure path, so that's unaffected either way.
 */
async function withAuthErrorRedirect(fallback: (query: string) => string, action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    unstable_rethrow(error);
    redirect(fallback(toRedirectQuery(error)));
  }
}

async function logEmail(recipient: string, template: string, result: { ok: boolean; error?: string }) {
  await db().insert(notificationLog).values({
    recipient,
    template,
    status: result.ok ? "SENT" : "FAILED",
    error: result.ok ? null : result.error ?? "unknown",
  });
}

async function limitAuth(key: string) {
  const decision = await rateLimit({
    bucket: "AUTH",
    key: await getRequestKey(key),
    limit: 8,
    windowMs: 60_000,
  });
  if (!decision.allowed) throw new Error("Too many attempts. Please wait a minute.");
}

export async function registerWithEmail(formData: FormData) {
  const returnTo = String(formData.get("returnTo") ?? "/");
  await withAuthErrorRedirect(
    (query) => `/sign-up?returnTo=${encodeURIComponent(returnTo)}&${query}`,
    async () => {
      await limitAuth("signup");
      const name = z.string().min(2).max(120).parse(String(formData.get("name") ?? ""));
      const email = emailSchema.parse(String(formData.get("email") ?? ""));
      const password = String(formData.get("password") ?? "");
      const passwordError = validatePassword(password);
      if (passwordError) throw new Error(passwordError);
      const client = db();
      const existing = (await client.select().from(users).where(eq(users.email, email)))[0];
      if (existing?.deletedAt || existing?.emailVerified) {
        // Intentionally silent — do not add an ?error= here for either case.
        // Confirming "this email is already registered" (verified or deleted)
        // would let an attacker enumerate accounts.
        redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
      }
      const passwordHash = await hashPassword(password);
      const env = getEnv();
      const role = email === env.ADMIN_EMAIL.toLowerCase() ? "ADMIN" : "CUSTOMER";
      if (existing) {
        await client
          .update(users)
          .set({ name, passwordHash, role })
          .where(eq(users.id, existing.id));
      } else {
        await client.insert(users).values({ name, email, passwordHash, role });
      }
      const issued = await issueVerificationCode({ identifier: email, purpose: "SIGNUP" });
      if (!issued.resentTooSoon && issued.code) {
        const sent = await sendEmail({ to: email, ...confirmSignupEmail(issued.code) });
        await logEmail(email, "confirm_signup", sent);
      }
      await auditLogSubject({
        actor: email,
        action: "AUTH_SIGNUP",
        targetType: "user",
        targetId: email,
      });
      redirect(`/verify-email?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`);
    },
  );
}

export async function verifyEmailCode(formData: FormData) {
  const returnTo = String(formData.get("returnTo") ?? "/account");
  const emailRaw = String(formData.get("email") ?? "");
  await withAuthErrorRedirect(
    (query) => `/verify-email?email=${encodeURIComponent(emailRaw)}&returnTo=${encodeURIComponent(returnTo)}&${query}`,
    async () => {
      await limitAuth("verify-email");
      const email = emailSchema.parse(emailRaw);
      const code = String(formData.get("code") ?? "").replace(/\D/g, "");
      const password = String(formData.get("password") ?? "");
      const result = await consumeVerificationCode({ identifier: email, purpose: "SIGNUP", code });
      if (!result.ok) throw new Error(result.error ?? "Invalid code");
      await db()
        .update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.email, email));
      if (password) {
        await signIn("credentials", { email, password, redirectTo: returnTo.startsWith("/") ? returnTo : "/account" });
      }
      redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    },
  );
}

export async function resendSignupCode(formData: FormData) {
  const emailRaw = String(formData.get("email") ?? "");
  await withAuthErrorRedirect(
    (query) => `/verify-email?email=${encodeURIComponent(emailRaw)}&${query}`,
    async () => {
      await limitAuth("resend-signup");
      const email = emailSchema.parse(emailRaw);
      const issued = await issueVerificationCode({ identifier: email, purpose: "SIGNUP" });
      if (issued.resentTooSoon) throw new Error("Please wait a moment before requesting another code");
      if (issued.code) {
        const sent = await sendEmail({ to: email, ...confirmSignupEmail(issued.code) });
        await logEmail(email, "confirm_signup", sent);
      }
    },
  );
}

export async function requestPasswordReset(formData: FormData) {
  const emailRaw = String(formData.get("email") ?? "");
  await withAuthErrorRedirect(
    (query) => `/forgot-password?${query}`,
    async () => {
      await limitAuth("forgot-password");
      const email = emailSchema.parse(emailRaw);
      const existing = (await db().select().from(users).where(eq(users.email, email)))[0];
      if (existing && !existing.deletedAt) {
        const issued = await issueVerificationCode({ identifier: email, purpose: "RESET_PASSWORD" });
        if (!issued.resentTooSoon && issued.code) {
          const sent = await sendEmail({ to: email, ...resetPasswordEmail(issued.code) });
          await logEmail(email, "reset_password", sent);
        }
      }
      // Always redirects the same way regardless of whether the account exists
      // — this branch is already enumeration-safe by design, untouched here.
      redirect(`/reset-password?email=${encodeURIComponent(email)}`);
    },
  );
}

export async function completePasswordReset(formData: FormData) {
  const emailRaw = String(formData.get("email") ?? "");
  await withAuthErrorRedirect(
    (query) => `/reset-password?email=${encodeURIComponent(emailRaw)}&${query}`,
    async () => {
      await limitAuth("reset-password");
      const email = emailSchema.parse(emailRaw);
      const code = String(formData.get("code") ?? "").replace(/\D/g, "");
      const password = String(formData.get("password") ?? "");
      const passwordError = validatePassword(password);
      if (passwordError) throw new Error(passwordError);
      const result = await consumeVerificationCode({ identifier: email, purpose: "RESET_PASSWORD", code });
      if (!result.ok) throw new Error(result.error ?? "Invalid code");
      const passwordHash = await hashPassword(password);
      await db()
        .update(users)
        .set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1`, emailVerified: new Date() })
        .where(eq(users.email, email));
      await sendEmail({
        to: email,
        ...securityNoticeEmail({
          subject: "Your Le Sillage password changed",
          body: "The password on your Le Sillage account was just changed.",
        }),
      });
      await auditLogSubject({
        actor: email,
        action: "AUTH_PASSWORD_CHANGE",
        targetType: "user",
        targetId: email,
      });
      redirect("/sign-in");
    },
  );
}

export async function signInWithPassword(formData: FormData) {
  const returnToRaw = String(formData.get("returnTo") ?? "/account");
  const returnTo = returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/account";
  await withAuthErrorRedirect(
    (query) => `/sign-in?returnTo=${encodeURIComponent(returnTo)}&${query}`,
    async () => {
      await limitAuth("password-signin");
      const email = emailSchema.parse(String(formData.get("email") ?? ""));
      const password = String(formData.get("password") ?? "");
      const user = (await db().select().from(users).where(eq(users.email, email)))[0];
      if (user && !user.emailVerified) {
        redirect(`/verify-email?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`);
      }
      await signIn("credentials", { email, password, redirectTo: returnTo });
    },
  );
}
