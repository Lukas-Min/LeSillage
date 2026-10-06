import { sql, eq, and, ne, desc } from "drizzle-orm";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { db } from "@/db/client";
import { orders, skus, products, promoSettings } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusPill } from "@/components/ui/status-pill";
import { AreaHeader, MiniStat, MiniStats, PAGE_ACTION_CLASS, PageColumns } from "@/components/ui/page-layout";
import { ProfitTable, manilaMonthName } from "@/components/admin/profit-table";
import { DEFAULT_DECANT_PREORDER_THRESHOLD_ML } from "@/domain/decant";
import { formatPHP } from "@/domain/money";
import { productsMissingCost } from "@/domain/product-cost";
import { labelForType } from "@/domain/product-type";
import { loadProfitPeriods } from "@/lib/dashboard-stats";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function countWhere(table: typeof orders | typeof skus, where: ReturnType<typeof eq>) {
  return db()
    .select({ c: sql<number>`count(*)` })
    .from(table)
    .where(where);
}

interface LowStockItem {
  productId: string;
  brand: string;
  name: string;
  detail: string;
}

export default async function AdminDashboard() {
  const client = db();
  const [pendingRow, awaitingRow, lowBottleSkus, decantProducts, promoRow, profit, allProducts, allSkus, recentOrders] =
    await Promise.all([
      countWhere(orders, eq(orders.status, "RECEIPT_SUBMITTED")),
      countWhere(orders, eq(orders.status, "AWAITING_PAYMENT")),
      // Real per-SKU stock only means something for FULL_BOTTLE/PARTIAL — decants
      // are excluded here since their stock column is always 0 (unused; decant
      // availability comes from the product's shared remainingMl pool below).
      client
        .select({ productId: products.id, brand: products.brand, name: products.name, stock: skus.stock })
        .from(skus)
        .innerJoin(products, eq(products.id, skus.productId))
        .where(
          and(
            sql`${skus.stock} <= 3`,
            eq(skus.fulfillment, "ON_HAND"),
            eq(skus.isActive, true),
            ne(products.type, "DECANT"),
          ),
        ),
      client
        .select({ id: products.id, brand: products.brand, name: products.name, remainingMl: products.remainingMl })
        .from(products)
        .where(and(eq(products.type, "DECANT"), eq(products.isActive, true))),
      client.select().from(promoSettings).where(eq(promoSettings.id, "singleton")),
      loadProfitPeriods(),
      client
        .select({
          id: products.id,
          brand: products.brand,
          name: products.name,
          type: products.type,
          isActive: products.isActive,
          costPrice: products.costPrice,
        })
        .from(products),
      client
        .select({
          productId: skus.productId,
          isActive: skus.isActive,
          provenance: skus.provenance,
          costPrice: skus.costPrice,
          fulfillment: skus.fulfillment,
          stock: skus.stock,
        })
        .from(skus),
      client
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          totalCentavos: orders.totalCentavos,
          createdAt: orders.createdAt,
          recipientName: orders.recipientName,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(5),
    ]);
  const pending = pendingRow[0]?.c ?? 0;
  const awaiting = awaitingRow[0]?.c ?? 0;
  const decantThreshold = promoRow[0]?.decantPreOrderThresholdMl ?? DEFAULT_DECANT_PREORDER_THRESHOLD_ML;
  const missingCost = productsMissingCost(allProducts, allSkus);

  const lowStockItems: LowStockItem[] = [
    ...lowBottleSkus.map((s) => ({ productId: s.productId, brand: s.brand, name: s.name, detail: `${s.stock} left` })),
    ...decantProducts
      .filter((p) => (p.remainingMl ?? 0) <= decantThreshold)
      .map((p) => ({ productId: p.id, brand: p.brand, name: p.name, detail: `${p.remainingMl ?? 0}ml left in pool` })),
  ];

  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Admin"
        title="Admin dashboard"
        actions={
          // Pending receipts and awaiting payment both sit on the Ongoing tab.
          <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
            <Link href="/admin/orders">View ongoing orders</Link>
          </Button>
        }
      />
      {missingCost.length > 0 ? (
        <Card id="missing-costs" role="region" aria-labelledby="missing-costs-title" className="border-gold/50 bg-gold/10">
          <CardHeader>
            <CardTitle id="missing-costs-title" className="flex items-center gap-2 text-base">
              <TriangleAlert className="size-4 shrink-0 text-gold-ink" aria-hidden="true" />
              {missingCost.length} product{missingCost.length === 1 ? " has" : "s have"} no cost set
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Without a cost, a sale of these counts as pure profit, so the profit below is too high. Open one and fill
              in its cost price.
            </p>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto">
              {missingCost.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2 transition-colors hover:bg-muted"
                  >
                    <span className="truncate">
                      {product.brand} — {product.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {labelForType(product.type)}
                      {product.isActive ? "" : " · hidden"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      {/* The dashboard's own content is these numbers, so they run full width
          above the list: two per row on a phone (Low stock spans both), three
          from sm. */}
      <MiniStats className="sm:grid-cols-3">
        <MiniStat label="Pending receipts" value={pending} />
        <MiniStat label="Awaiting payment" value={awaiting} />
        <MiniStat label="Low stock" value={lowStockItems.length} className="col-span-2 sm:col-span-1" />
      </MiniStats>
      <PageColumns
        main={
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ProfitTable
                  rows={[
                    { label: `This month · ${manilaMonthName(profit.thisMonthStart)}`, summary: profit.thisMonth },
                    { label: `Last month · ${manilaMonthName(profit.lastMonthStart)}`, summary: profit.lastMonth },
                    { label: "All time", summary: profit.allTime },
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  Paid orders only (confirmed onward), by the day they were placed. Sales are what customers paid for
                  the items after discounts; delivery fees aren&apos;t counted. Cost is each item&apos;s cost today, so
                  changing a cost changes past profit too.
                  {profit.uncostedUnits > 0
                    ? ` ${profit.uncostedUnits} item${profit.uncostedUnits === 1 ? "" : "s"} sold had no cost set and count at ${formatPHP(0)}.`
                    : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Low stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {lowStockItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border/80 p-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nothing running low — bottles above 3 units, decant pools above {decantThreshold}ml.
                    </p>
                  </div>
                ) : (
                  lowStockItems.map((item) => (
                    <Link
                      key={`${item.productId}-${item.detail}`}
                      href={`/admin/products/${item.productId}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 transition-colors hover:bg-muted"
                    >
                      <span className="truncate">
                        {item.brand} — {item.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{item.detail}</span>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        }
        sideLabel="Recent orders"
        side={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border/80 p-10 text-center">
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="block space-y-1 rounded-md border border-border/60 px-3 py-2 transition-colors hover:bg-muted"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{order.orderNumber}</span>
                      <span className="shrink-0 tabular-nums">{formatPHP(order.totalCentavos)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {order.recipientName} · {formatDate(order.createdAt)}
                      </span>
                      <OrderStatusPill status={order.status} className="shrink-0" />
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
