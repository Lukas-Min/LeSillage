import { paymentDeadline } from "./auto-reject";

/** Sent once, when half the one-hour pay window is gone. */
export const PAYMENT_REMINDER_AFTER_MS = 30 * 60 * 1000;
/** How long the open payment page waits before trying that email again. */
export const PAYMENT_REMINDER_RETRY_MS = 15 * 60 * 1000;
export const PAYMENT_REMINDER_BATCH = 40;

/** When the reminder is due for an order whose pay window started at statusUpdatedAt. */
export function paymentReminderTime(statusUpdatedAt: Date): Date {
  return new Date(statusUpdatedAt.getTime() + PAYMENT_REMINDER_AFTER_MS);
}

export function isDueForPaymentReminder(args: {
  status: string;
  statusUpdatedAt: Date;
  paymentReminderSentAt: Date | null;
  now: Date;
}): boolean {
  if (args.status !== "AWAITING_PAYMENT") return false;
  if (args.paymentReminderSentAt) return false;
  // Not once the hour is up: "pay by" would already be in the past, and the order is about to be cancelled.
  if (args.now.getTime() >= paymentDeadline(args.statusUpdatedAt).getTime()) return false;
  return args.now.getTime() >= paymentReminderTime(args.statusUpdatedAt).getTime();
}
