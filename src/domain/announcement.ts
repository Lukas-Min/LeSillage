/**
 * Announcement-bar shape and parsing. Pure — no database import — because the
 * admin form is a client component and needs the limits; pulling these from the
 * DB-backed loader would drag the postgres driver into the browser bundle.
 */

export const MAX_ANNOUNCEMENT_MESSAGES = 8;
export const MAX_ANNOUNCEMENT_LENGTH = 160;

export interface AnnouncementConfig {
  enabled: boolean;
  messages: string[];
}

/**
 * What the bar says until an admin saves something of their own. Kept in sync
 * with the live promo rules: WELCOME10 is ORDER-scope 10% (fragrances only,
 * delivery still charged) with no minimum spend and one use per customer, and
 * ₱2,000 of discounted decants unlocks free delivery plus a tester.
 */
export const DEFAULT_ANNOUNCEMENT: AnnouncementConfig = {
  enabled: true,
  messages: [
    "Enjoy 10% off your fragrances with code WELCOME10 · no minimum spend, one use per customer",
    "Free delivery on ₱2,000 of decants",
    "Plus a complimentary tester, matched to your order",
    "Decants, partials and full bottles — find your signature scent",
  ],
};

/**
 * Tolerant on purpose: this value is read on every page render, so a row that
 * is missing, malformed, or hand-edited must fall back to something sensible
 * rather than break the header.
 */
export function parseAnnouncement(raw: string | null | undefined): AnnouncementConfig {
  if (!raw) return DEFAULT_ANNOUNCEMENT;
  try {
    const parsed = JSON.parse(raw) as Partial<AnnouncementConfig>;
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.map((message) => String(message).trim()).filter(Boolean)
      : [];
    // An explicitly saved empty list means "off", not "fall back to defaults" —
    // otherwise an admin could never clear the bar.
    if (messages.length === 0) return { enabled: false, messages: [] };
    return { enabled: parsed.enabled !== false, messages };
  } catch {
    return DEFAULT_ANNOUNCEMENT;
  }
}

/**
 * How many copies of the message list the marquee track needs to look endless.
 *
 * The track scrolls by exactly one copy's width and then loops. While that
 * first copy is being consumed, the copies behind it must still span the whole
 * bar, or its tail runs out and a blank gap scrolls past:
 *
 *   (copies - 1) * copyWidth >= barWidth
 *
 * Two is the floor — one copy on screen and one following it in. A fixed two
 * only looks endless while a single copy is at least as wide as the bar, which
 * is why a wide monitor (or short messages) showed the gap.
 */
export function marqueeCopies(barWidth: number, copyWidth: number): number {
  if (!Number.isFinite(barWidth) || !Number.isFinite(copyWidth) || copyWidth <= 0) return 2;
  return Math.max(2, Math.ceil(barWidth / copyWidth) + 1);
}

/**
 * The widest desktop the server-rendered bar should already cover before
 * hydration — a 34" ultrawide at 100% scaling. The CSS animation starts on
 * first paint, well before React measures anything, so the HTML has to ship
 * enough copies on its own or a wide screen sees the track run out until the
 * client-side measurement catches up.
 */
export const SSR_MARQUEE_BAR_WIDTH = 3440;

/** Padding + diamond separator after every message, in ems of the bar font. */
const SEPARATOR_EM = 3.5;
/**
 * Average advance per character, in ems. The real figure for the bar's font
 * is about 0.5; this is deliberately lower so the estimate errs towards
 * *more* copies — an extra `<li>` or two is free, a gap is not.
 */
const GLYPH_EM = 0.45;

/**
 * A pre-hydration guess at one copy's width, from nothing but the text. Only
 * ever used to seed the server render; `marqueeCopies` is re-run against
 * measured widths as soon as the component mounts.
 */
export function estimateMarqueeCopyWidth(messages: string[], fontPx: number): number {
  return messages.reduce((sum, message) => sum + (message.length * GLYPH_EM + SEPARATOR_EM) * fontPx, 0);
}
