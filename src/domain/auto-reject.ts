/** How long an unpaid order holds its on-hand stock before it is cancelled. */
export const PAYMENT_WINDOW_MS = 60 * 60 * 1000;
export const AUTO_REJECT_AFTER_MS = PAYMENT_WINDOW_MS;
export const AUTO_REJECT_BATCH = 40;

export const AUTO_REJECT_REASON =
  "Automatically cancelled — no payment receipt was submitted within 1 hour of placing the order.";

export function paymentDeadline(statusUpdatedAt: Date): Date {
  return new Date(statusUpdatedAt.getTime() + PAYMENT_WINDOW_MS);
}

export function isDueForAutoReject(args: {
  status: string;
  statusUpdatedAt: Date;
  now: Date;
}): boolean {
  if (args.status !== "AWAITING_PAYMENT") return false;
  return args.now.getTime() - args.statusUpdatedAt.getTime() >= AUTO_REJECT_AFTER_MS;
}
