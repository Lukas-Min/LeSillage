import type { Fulfillment } from "@/db/schema";

export const DECANT_SIZES_ML = [3, 5, 10, 30] as const;
export type DecantSizeMl = (typeof DECANT_SIZES_ML)[number];
export const DEFAULT_DECANT_PREORDER_THRESHOLD_ML = 10;

export function isDecantSize(sizeMl: number | null | undefined): sizeMl is DecantSizeMl {
  return sizeMl === 3 || sizeMl === 5 || sizeMl === 10 || sizeMl === 30;
}

export function decantFulfillment(args: {
  remainingMl: number;
  sizeMl: number;
  thresholdMl?: number;
}): Fulfillment {
  const threshold = args.thresholdMl ?? DEFAULT_DECANT_PREORDER_THRESHOLD_ML;
  if (args.remainingMl < threshold) return "PRE_ORDER";
  if (args.remainingMl >= args.sizeMl) return "ON_HAND";
  return "PRE_ORDER";
}

export function mlToReserve(args: {
  remainingMl: number;
  sizeMl: number;
  quantity: number;
  fulfillment: Fulfillment;
}): number {
  if (args.fulfillment !== "ON_HAND") return 0;
  return Math.min(args.remainingMl, args.sizeMl * args.quantity);
}

export function clampRemainingMl(remainingMl: number): number {
  if (!Number.isFinite(remainingMl)) return 0;
  return Math.max(0, Math.floor(remainingMl));
}
