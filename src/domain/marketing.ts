import { siteWideDiscountStatus, type SiteWideDiscountConfig } from "./promo";

// Marketing email goes out through Gmail, which caps a regular account at
// about 500 messages a day, order emails included. The Worker runs every 15
// minutes (96 runs a day), so 4 per run is 384 a day at most, leaving room for
// order emails.
export const MARKETING_EMAILS_PER_RUN = 4;
// A run that dies mid-send leaves rows SENDING; the next run marks them FAILED
// after this (not resent, to avoid a duplicate).
export const MARKETING_SEND_STALE_MS = 15 * 60 * 1000;

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
 * that are neither deleted nor archived, plus newsletter sign-ups (the caller
 * passes only confirmed ones — double opt-in). An account counts on its own
 * only once verified, so signing up with someone else's address can't
 * subscribe them; a confirmed newsletter sign-up proves the address too, so
 * it also counts for an unverified account. When an email belongs to an
 * account, the account's setting decides — turning promotions off in
 * Account → Notifications wins over a newsletter row, and deleted or archived
 * accounts get nothing. Emails are compared lowercased and listed once.
 */
export function mergeMarketingRecipients(
  accounts: readonly MarketingAccount[],
  newsletterEmails: readonly string[],
): MarketingRecipient[] {
  const byEmail = new Map<string, MarketingRecipient>();
  const accountByEmail = new Map<string, MarketingAccount>();
  const wantsEmail = (account: MarketingAccount) => account.marketingOptIn && !account.deletedAt && !account.archivedAt;
  for (const account of accounts) {
    if (!account.email) continue;
    const email = account.email.trim().toLowerCase();
    accountByEmail.set(email, account);
    if (wantsEmail(account) && account.verified) {
      byEmail.set(email, { email, name: account.name });
    }
  }
  for (const raw of newsletterEmails) {
    const email = raw.trim().toLowerCase();
    if (byEmail.has(email)) continue;
    const account = accountByEmail.get(email);
    if (!account) byEmail.set(email, { email, name: null });
    else if (wantsEmail(account)) byEmail.set(email, { email, name: account.name });
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
