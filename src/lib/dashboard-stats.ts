import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orderItems, orders, skus } from "@/db/schema";
import { PAID_STATUS_LIST } from "@/domain/order-state";
import { phMonthStart, summarizeProfit, type ProfitSummary } from "@/domain/profit";

export interface ProfitPeriods {
  thisMonth: ProfitSummary;
  lastMonth: ProfitSummary;
  allTime: ProfitSummary;
  /** Units sold from sizes with no cost set; they count at ₱0 cost. */
  uncostedUnits: number;
  /** The first instant of each month, for labelling. */
  thisMonthStart: Date;
  lastMonthStart: Date;
}

/**
 * Sales, cost and profit for paid orders (confirmed onward), by order date in
 * Manila time. Sales is the merchandise after every discount (orders.subtotal
 * already has an order promo code taken off; delivery fees aren't in it).
 * Cost is each sold size's cost *today* — orders don't snapshot it — so
 * changing a cost changes past profit too.
 */
export function profitQueries(client: ReturnType<typeof db>, now: Date) {
  const thisMonthStart = phMonthStart(now);
  const lastMonthStart = phMonthStart(now, 1);
  const monthStart = thisMonthStart.toISOString();
  const lastStart = lastMonthStart.toISOString();
  const inThisMonth = sql`${orders.createdAt} >= ${monthStart}::timestamp`;
  const inLastMonth = sql`(${orders.createdAt} >= ${lastStart}::timestamp and ${orders.createdAt} < ${monthStart}::timestamp)`;
  const paid = inArray(orders.status, [...PAID_STATUS_LIST]);

  const salesQuery = client
    .select({
      allOrders: sql<string>`count(*)`,
      allSales: sql<string>`coalesce(sum(${orders.subtotalCentavos}), 0)`,
      monthOrders: sql<string>`count(*) filter (where ${inThisMonth})`,
      monthSales: sql<string>`coalesce(sum(${orders.subtotalCentavos}) filter (where ${inThisMonth}), 0)`,
      lastOrders: sql<string>`count(*) filter (where ${inLastMonth})`,
      lastSales: sql<string>`coalesce(sum(${orders.subtotalCentavos}) filter (where ${inLastMonth}), 0)`,
    })
    .from(orders)
    .where(paid);
  const costQuery = client
    .select({
      allCost: sql<string>`coalesce(sum(${skus.costPrice} * ${orderItems.quantity}), 0)`,
      monthCost: sql<string>`coalesce(sum(${skus.costPrice} * ${orderItems.quantity}) filter (where ${inThisMonth}), 0)`,
      lastCost: sql<string>`coalesce(sum(${skus.costPrice} * ${orderItems.quantity}) filter (where ${inLastMonth}), 0)`,
      uncostedUnits: sql<string>`coalesce(sum(${orderItems.quantity}) filter (where ${skus.costPrice} <= 0), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(skus, eq(skus.id, orderItems.skuId))
    .where(paid);
  return { salesQuery, costQuery, thisMonthStart, lastMonthStart: phMonthStart(now, 1) };
}

export async function loadProfitPeriods(now = new Date()): Promise<ProfitPeriods> {
  const { salesQuery, costQuery, thisMonthStart, lastMonthStart } = profitQueries(db(), now);
  const [sales, costs] = await Promise.all([salesQuery, costQuery]);
  const s = sales[0];
  const c = costs[0];
  return {
    thisMonth: summarizeProfit({
      orders: Number(s?.monthOrders ?? 0),
      salesCentavos: Number(s?.monthSales ?? 0),
      costCentavos: Number(c?.monthCost ?? 0),
    }),
    lastMonth: summarizeProfit({
      orders: Number(s?.lastOrders ?? 0),
      salesCentavos: Number(s?.lastSales ?? 0),
      costCentavos: Number(c?.lastCost ?? 0),
    }),
    allTime: summarizeProfit({
      orders: Number(s?.allOrders ?? 0),
      salesCentavos: Number(s?.allSales ?? 0),
      costCentavos: Number(c?.allCost ?? 0),
    }),
    uncostedUnits: Number(c?.uncostedUnits ?? 0),
    thisMonthStart,
    lastMonthStart,
  };
}
