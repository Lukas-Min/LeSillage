/** Sent once, when half the one-hour pay window is gone. */
export const PAYMENT_REMINDER_AFTER_MS = 30 * 60 * 1000;
/** How long the open payment page waits before trying that email again. */
export const PAYMENT_REMINDER_RETRY_MS = 15 * 60 * 1000;
export const PAYMENT_REMINDER_BATCH = 40;

export function isDueForPaymentReminder(args: {
  status: string;
  statusUpdatedAt: Date;
  paymentReminderSentAt: Date | null;
  now: Date;
}): boolean {
  if (args.status !== "AWAITING_PAYMENT") return false;
  if (args.paymentReminderSentAt) return false;
  return args.now.getTime() - args.statusUpdatedAt.getTime() >= PAYMENT_REMINDER_AFTER_MS;
}
