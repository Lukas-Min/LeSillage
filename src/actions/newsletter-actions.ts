"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { newsletterSubscribers, notificationLog } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { isValidEmailLink, newsletterConfirmUrl } from "@/lib/email-links";
import { newsletterConfirmEmail } from "@/lib/email-templates";
import { confirmNewsletterEmail, unsubscribeEmail } from "@/lib/marketing-recipients";
import { getRequestKey, rateLimit } from "@/lib/rate-limit";

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

export type SubscribeResult = { ok: true; needsConfirmation: boolean } | { ok: false; error: string };

/**
 * Double opt-in: anyone can type any address here, so a sign-up only counts
 * once the address owner clicks the emailed confirm link. A customer signed in
 * to that same address is confirmed straight away — the account proves it.
 */
export async function subscribeToNewsletter(formData: FormData): Promise<SubscribeResult> {
  const decision = await rateLimit({
    bucket: "AUTH",
    key: await getRequestKey("newsletter"),
    limit: 8,
    windowMs: 60_000,
  });
  if (!decision.allowed) return { ok: false, error: "Please wait a minute and try again." };

  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const email = parsed.data;

  const session = await auth();
  if (session?.user?.email?.trim().toLowerCase() === email) {
    await confirmNewsletterEmail(email);
    return { ok: true, needsConfirmation: false };
  }

  // Same answer whether or not the address is already confirmed, so the form
  // can't be used to find out who subscribes.
  const existing = (
    await db()
      .select({ confirmedAt: newsletterSubscribers.confirmedAt })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
  )[0];
  if (existing?.confirmedAt) return { ok: true, needsConfirmation: true };

  // Keyed on the address alone (not the IP), so nobody can flood one inbox.
  const perAddress = await rateLimit({
    bucket: "AUTH",
    key: `newsletter-confirm:${email}`,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!perAddress.allowed) return { ok: true, needsConfirmation: true };

  await db().insert(newsletterSubscribers).values({ email }).onConflictDoNothing({ target: newsletterSubscribers.email });
  const sent = await sendEmail({ to: email, ...newsletterConfirmEmail({ confirmUrl: newsletterConfirmUrl(email) }) });
  await db().insert(notificationLog).values({
    recipient: email,
    template: "newsletter_confirm",
    status: sent.ok ? "SENT" : "FAILED",
    error: sent.ok ? null : sent.error ?? "unknown",
  });
  if (!sent.ok) return { ok: false, error: "We couldn't send the confirmation email. Please try again." };
  return { ok: true, needsConfirmation: true };
}

function readLink(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    token: String(formData.get("token") ?? ""),
  };
}

/** The Confirm button on /newsletter/confirm. */
export async function confirmNewsletter(formData: FormData): Promise<void> {
  const { email, token } = readLink(formData);
  if (!isValidEmailLink("newsletter-confirm", email, token)) redirect("/newsletter/confirm?status=invalid");
  await confirmNewsletterEmail(email);
  redirect("/newsletter/confirm?status=confirmed");
}

/** The Unsubscribe button on /unsubscribe. */
export async function unsubscribeFromEmails(formData: FormData): Promise<void> {
  const { email, token } = readLink(formData);
  if (!isValidEmailLink("unsubscribe", email, token)) redirect("/unsubscribe?status=invalid");
  await unsubscribeEmail(email);
  redirect("/unsubscribe?status=done");
}
