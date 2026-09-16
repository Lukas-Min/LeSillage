export const DELIVERY_FOLLOWUP_AFTER_MS = 2 * 24 * 60 * 60 * 1000;
export const DELIVERY_FOLLOWUP_BATCH = 40;

export function isDueForDeliveryFollowup(args: {
  status: string;
  statusUpdatedAt: Date;
  deliveryFollowupSentAt: Date | null;
  now: Date;
}): boolean {
  if (args.status !== "DELIVERED") return false;
  if (args.deliveryFollowupSentAt) return false;
  return args.now.getTime() - args.statusUpdatedAt.getTime() >= DELIVERY_FOLLOWUP_AFTER_MS;
}
