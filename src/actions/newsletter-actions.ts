"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { newsletterSubscribers, users } from "@/db/schema";
import { getRequestKey, rateLimit } from "@/lib/rate-limit";

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

export async function subscribeToNewsletter(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
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

  await db()
    .insert(newsletterSubscribers)
    .values({ email })
    .onConflictDoNothing({ target: newsletterSubscribers.email });
  await db()
    .update(users)
    .set({ marketingOptIn: true })
    .where(and(eq(users.email, email), isNull(users.deletedAt)));
  return { ok: true };
}
