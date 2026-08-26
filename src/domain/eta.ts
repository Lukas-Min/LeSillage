import type { Fulfillment } from "@/db/schema";

export interface EtaLine {
  fulfillment: Fulfillment;
  orderedAt: Date;
}

export interface EtaRange {
  label: string;
  minDays: number;
  maxDays: number;
  sameDayAvailable: boolean;
}

const PH_DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function isWeekendInManila(date: Date): boolean {
  const formatter = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
  });
  const day = formatter.format(date);
  return day === "Sat" || day === "Sun";
}

export function preOrderEta(): EtaRange {
  return { label: "3 to 30 days (pre-order)", minDays: 3, maxDays: 30, sameDayAvailable: false };
}

export function onHandEta(orderedAt: Date): EtaRange {
  if (isWeekendInManila(orderedAt)) {
    return { label: "Same-day delivery available (weekend)", minDays: 0, maxDays: 0, sameDayAvailable: true };
  }
  return { label: "1 to 2 days", minDays: 1, maxDays: 2, sameDayAvailable: false };
}

export function computeEtaSummary(lines: EtaLine[]): EtaRange[] {
  const summaries: EtaRange[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line.fulfillment)) continue;
    seen.add(line.fulfillment);
    if (line.fulfillment === "PRE_ORDER") summaries.push(preOrderEta());
    if (line.fulfillment === "ON_HAND") summaries.push(onHandEta(line.orderedAt));
  }
  return summaries;
}

export function dayLabelPH(date: Date): string {
  return PH_DAYS_SHORT[date.getDay()];
}