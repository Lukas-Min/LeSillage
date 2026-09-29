import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, marketingEmails, newsletterSubscribers, users } from "@/db/schema";
import { mergeMarketingRecipients, type MarketingRecipient } from "@/domain/marketing";

/** Everyone subscribed to news and promotions — see mergeMarketingRecipients for the rules. */
export async function loadMarketingRecipients(): Promise<MarketingRecipient[]> {
  const client = db();
  const [people, oauthLinks, subscribers] = await Promise.all([
    client
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        marketingOptIn: users.marketingOptIn,
        emailVerified: users.emailVerified,
        deletedAt: users.deletedAt,
        archivedAt: users.archivedAt,
      })
      .from(users),
    client.select({ userId: accounts.userId }).from(accounts),
    // Only confirmed sign-ups: anyone can type any address into the form.
    client
      .select({ email: newsletterSubscribers.email })
      .from(newsletterSubscribers)
      .where(isNotNull(newsletterSubscribers.confirmedAt)),
  ]);
  // Google sign-ins don't set emailVerified here, but Google already verified the address.
  const linked = new Set(oauthLinks.map((link) => link.userId));
  return mergeMarketingRecipients(
    people.map((person) => ({ ...person, verified: person.emailVerified !== null || linked.has(person.id) })),
    subscribers.map((subscriber) => subscriber.email),
  );
}

/**
 * Stops all news and promotions to this address: removes the newsletter
 * sign-up, turns off the matching account's setting, and drops anything
 * still waiting in the send queue. Safe to repeat.
 */
export async function unsubscribeEmail(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  await db().transaction(async (tx) => {
    await tx.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
    await tx
      .update(users)
      .set({ marketingOptIn: false })
      .where(and(eq(sql`lower(${users.email})`, email), isNull(users.deletedAt)));
    await tx
      .update(marketingEmails)
      .set({ status: "SKIPPED", error: "Unsubscribed" })
      .where(and(eq(marketingEmails.recipient, email), eq(marketingEmails.status, "PENDING")));
  });
}

/**
 * The address owner clicked the confirm link: the sign-up now counts, and an
 * account under the same address gets news and promotions switched on — the
 * click proves they own it.
 */
export async function confirmNewsletterEmail(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const now = new Date();
  await db().transaction(async (tx) => {
    await tx
      .insert(newsletterSubscribers)
      .values({ email, confirmedAt: now })
      .onConflictDoUpdate({ target: newsletterSubscribers.email, set: { confirmedAt: now } });
    await tx
      .update(users)
      .set({ marketingOptIn: true })
      .where(and(eq(sql`lower(${users.email})`, email), isNull(users.deletedAt), isNull(users.archivedAt)));
  });
}
