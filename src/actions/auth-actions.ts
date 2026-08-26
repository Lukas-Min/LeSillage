"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { signIn } from "@/auth";

export async function startOAuthSignIn(provider: "google" | "facebook", returnTo: string) {
  await signIn(provider, { redirectTo: returnTo || "/" });
}

export async function requestGuestCartMerge(returnTo: string) {
  return returnTo;
}

export async function ensureCustomerAccount(email: string, name: string): Promise<string> {
  const client = db();
  const normalized = email.trim().toLowerCase();
  const existing = (await client.select().from(users).where(eq(users.email, normalized)))[0];
  if (existing) return existing.id;
  const inserted = await client.insert(users).values({ email: normalized, name }).returning();
  return inserted[0].id;
}

export async function requireReturnTo(returnTo: string | null) {
  if (!returnTo) return "/";
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return "/";
  return returnTo;
}

export async function redirectAfterAuth(returnTo: string) {
  redirect(returnTo);
}