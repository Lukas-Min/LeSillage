export const AUTO_REJECT_AFTER_MS = 24 * 60 * 60 * 1000;
export const AUTO_REJECT_BATCH = 40;

export const AUTO_REJECT_REASON =
  "Automatically cancelled — no payment receipt was submitted within 24 hours of placing the order.";

export function isDueForAutoReject(args: {
  status: string;
  statusUpdatedAt: Date;
  now: Date;
}): boolean {
  if (args.status !== "AWAITING_PAYMENT") return false;
  return args.now.getTime() - args.statusUpdatedAt.getTime() >= AUTO_REJECT_AFTER_MS;
}
