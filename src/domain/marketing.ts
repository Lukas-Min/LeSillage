import { siteWideDiscountStatus, type SiteWideDiscountConfig } from "./promo";

export interface MarketingRecipient {
  email: string;
  name: string | null;
}

export interface MarketingAccount {
  email: string | null;
  name: string | null;
  marketingOptIn: boolean;
  deletedAt: Date | null;
  archivedAt: Date | null;
  /** Entered the email code, or signed in with Google. */
  verified: boolean;
}

/**
 * Everyone who asked for news and promotions: accounts with marketing opt-in
 * that are neither deleted nor archived, plus newsletter sign-ups with no
 * account. Accounts must be verified, so signing up with someone else's
 * address can't subscribe them. When an email belongs to an account, the
 * account's setting decides — turning promotions off in Account →
 * Notifications wins over an old newsletter row. Emails are compared
 * lowercased and listed once.
 */
export function mergeMarketingRecipients(
  accounts: readonly MarketingAccount[],
  newsletterEmails: readonly string[],
): MarketingRecipient[] {
  const byEmail = new Map<string, MarketingRecipient>();
  const accountEmails = new Set<string>();
  for (const account of accounts) {
    if (!account.email) continue;
    const email = account.email.trim().toLowerCase();
    accountEmails.add(email);
    if (account.marketingOptIn && account.verified && !account.deletedAt && !account.archivedAt) {
      byEmail.set(email, { email, name: account.name });
    }
  }
  for (const raw of newsletterEmails) {
    const email = raw.trim().toLowerCase();
    if (!accountEmails.has(email) && !byEmail.has(email)) byEmail.set(email, { email, name: null });
  }
  return [...byEmail.values()];
}

/**
 * Subscribers hear about a site-wide sale once: on the save that turns it on,
 * whether it runs now or is scheduled. Re-saving a sale that's already on
 * sends nothing; giving one that ended new dates counts as turning it on.
 */
export function shouldAnnounceSiteWideDiscount(
  previous: SiteWideDiscountConfig,
  next: SiteWideDiscountConfig,
  now: Date = new Date(),
): boolean {
  const live = (config: SiteWideDiscountConfig) => {
    const status = siteWideDiscountStatus(config, now);
    return status === "ACTIVE" || status === "SCHEDULED";
  };
  return !live(previous) && live(next);
}
