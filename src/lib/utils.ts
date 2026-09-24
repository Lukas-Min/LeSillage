import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

// "Sep 22, 2026" / "Sep 22, 2026, 6:36 AM" — a spelled-out month reads faster
// than a numeric date stamp ("9/22/2026", ambiguous as d/m or m/d besides),
// used everywhere a date is shown to a customer or admin. Locale is fixed
// rather than left to the runtime's default so output doesn't drift across
// environments.
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" })
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

export function formatDate(value: Date): string {
  return DATE_FORMATTER.format(value)
}

export function formatDateTime(value: Date): string {
  return DATE_TIME_FORMATTER.format(value)
}
