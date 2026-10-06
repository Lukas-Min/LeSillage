/** Philippine Time is UTC+8 all year (see ph-date.ts). */
const PH_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * The instant a calendar month starts in Manila (00:00 on the 1st, +08:00),
 * `monthsBack` months before the one `now` falls in. Order dates are stored
 * in UTC, so the dashboard compares them against this instead of the server's
 * own idea of "this month".
 */
export function phMonthStart(now: Date, monthsBack = 0): Date {
  const manila = new Date(now.getTime() + PH_UTC_OFFSET_MS);
  return new Date(Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth() - monthsBack, 1) - PH_UTC_OFFSET_MS);
}

export interface ProfitTotals {
  orders: number;
  /** What customers paid for the items after every discount, delivery fees left out. */
  salesCentavos: number;
  /** What those items cost us. */
  costCentavos: number;
}

export interface ProfitSummary extends ProfitTotals {
  profitCentavos: number;
  /** Profit as a share of sales, one decimal; null when there were no sales. */
  marginPercent: number | null;
}

export function summarizeProfit(totals: ProfitTotals): ProfitSummary {
  const profitCentavos = totals.salesCentavos - totals.costCentavos;
  return {
    ...totals,
    profitCentavos,
    marginPercent: totals.salesCentavos > 0 ? Math.round((profitCentavos * 1000) / totals.salesCentavos) / 10 : null,
  };
}
