"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { rateLimit, getRequestKey } from "@/lib/rate-limit";

const THEMES = ["light", "dark", "system"] as const;

/** Persists a signed-in customer's theme choice to their account so it follows them across devices. A no-op for guests — the toggle already keeps working via localStorage (next-themes) for anyone not signed in. */
export async function updateThemePreference(theme: string) {
  if (!THEMES.includes(theme as (typeof THEMES)[number])) return;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  const decision = await rateLimit({
    bucket: "ACCOUNT",
    key: await getRequestKey("theme-update", userId),
    limit: 30,
    windowMs: 60_000,
  });
  if (!decision.allowed) return;
  await db().update(users).set({ themePreference: theme }).where(eq(users.id, userId));
}
