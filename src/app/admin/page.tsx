import { sql, eq, and, ne } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { orders, skus, products, promoSettings } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader, MiniStat, MiniStats, PageColumns } from "@/components/ui/page-layout";
import { DEFAULT_DECANT_PREORDER_THRESHOLD_ML } from "@/domain/decant";

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
  const [pendingRow, awaitingRow, lowBottleSkus, decantProducts, promoRow] = await Promise.all([
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
  ]);
  const pending = pendingRow[0]?.c ?? 0;
  const awaiting = awaitingRow[0]?.c ?? 0;
  const decantThreshold = promoRow[0]?.decantPreOrderThresholdMl ?? DEFAULT_DECANT_PREORDER_THRESHOLD_ML;

  const lowStockItems: LowStockItem[] = [
    ...lowBottleSkus.map((s) => ({ productId: s.productId, brand: s.brand, name: s.name, detail: `${s.stock} left` })),
    ...decantProducts
      .filter((p) => (p.remainingMl ?? 0) <= decantThreshold)
      .map((p) => ({ productId: p.id, brand: p.brand, name: p.name, detail: `${p.remainingMl ?? 0}ml left in pool` })),
  ];

  return (
    <div className="space-y-6">
      <AreaHeader eyebrow="Admin" title="Admin dashboard" />
      <PageColumns
        side={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">At a glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MiniStats>
                <MiniStat label="Pending receipts" value={pending} />
                <MiniStat label="Awaiting payment" value={awaiting} />
                <MiniStat label="Low stock" value={lowStockItems.length} className="col-span-2" />
              </MiniStats>
              {/* Pending receipts and awaiting payment both sit on the Ongoing tab. */}
              <Link
                href="/admin/orders"
                className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:text-foreground"
              >
                View ongoing orders
              </Link>
            </CardContent>
          </Card>
        }
        main={
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
        }
      />
    </div>
  );
}
