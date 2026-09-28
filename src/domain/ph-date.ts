/**
 * Philippine Time is UTC+8 year-round (no DST). A bare <input type="date">
 * value ("2024-12-25") has no timezone of its own — new Date(value) parses
 * it as UTC midnight, i.e. 8:00 AM PHT, so a "start Dec 25" would activate
 * 8 hours late and an "end Dec 25" would expire 8 hours early relative to
 * what that calendar date actually means in Manila. These helpers anchor
 * explicitly to +08:00 so a date-only input round-trips correctly, shared
 * by every admin form with a start/end date pair (promo codes, product
 * discounts) instead of each one re-deriving its own copy.
 */
const PH_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function parsePhDateBoundary(value: string | undefined | null, boundary: "start" | "end"): Date | null {
  if (!value) return null;
  const startOfDayPht = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(startOfDayPht.getTime())) return null;
  // "Ends on Dec 25" means valid through the end of that day in Manila —
  // stored as the exclusive upper bound, the start of the following day, so
  // an `endsAt < now` check only trips once Dec 25 (PHT) has fully elapsed
  // rather than 8 hours into it.
  return boundary === "end" ? new Date(startOfDayPht.getTime() + ONE_DAY_MS) : startOfDayPht;
}

/** Undoes the "end" boundary's extra day, so the *stored* value (the start
 *  of the day after the last valid one) maps back to the calendar day an
 *  admin actually picked, for any human-readable display of it (a plain
 *  "Dec 26" table cell, not just the <input type="date"> round-trip). */
export function toDisplayDate(value: Date | null, boundary: "start" | "end"): Date | null {
  if (!value) return null;
  return boundary === "end" ? new Date(value.getTime() - ONE_DAY_MS) : value;
}

/** The reverse of parsePhDateBoundary, for pre-filling an <input type="date"> from a stored Date. */
export function formatPhDateBoundary(value: Date | null, boundary: "start" | "end"): string {
  const displayDate = toDisplayDate(value, boundary);
  if (!displayDate) return "";
  return new Date(displayDate.getTime() + PH_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

/** Today's calendar date in Manila, as a "YYYY-MM-DD" <input type="date"> value. */
export function todayPhDateString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}
