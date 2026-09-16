export const DELIVERY_AUTO_COMPLETE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
export const DELIVERY_AUTO_COMPLETE_BATCH = 40;

// Fires regardless of whether the day-2 follow-up email was ever sent or
// answered — same reasoning as auto-reject: a self-healing cutoff off the
// order's own statusUpdatedAt is more robust than depending on a prior
// cron's success.
export function isDueForDeliveryAutoComplete(args: {
  status: string;
  statusUpdatedAt: Date;
  now: Date;
}): boolean {
  if (args.status !== "DELIVERED") return false;
  return args.now.getTime() - args.statusUpdatedAt.getTime() >= DELIVERY_AUTO_COMPLETE_AFTER_MS;
}
