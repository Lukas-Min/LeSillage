import { db } from "@/db/client";
import { accounts, newsletterSubscribers, users } from "@/db/schema";
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
    client.select({ email: newsletterSubscribers.email }).from(newsletterSubscribers),
  ]);
  // Google sign-ins don't set emailVerified here, but Google already verified the address.
  const linked = new Set(oauthLinks.map((link) => link.userId));
  return mergeMarketingRecipients(
    people.map((person) => ({ ...person, verified: person.emailVerified !== null || linked.has(person.id) })),
    subscribers.map((subscriber) => subscriber.email),
  );
}
