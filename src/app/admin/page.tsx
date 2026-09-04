import { sql, eq, and, ne } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { orders, skus, products, promoSettings } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Admin dashboard</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending receipts</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{pending}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Awaiting payment</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{awaiting}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Low stock</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{lowStockItems.length}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Low stock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {lowStockItems.length === 0 ? (
            <p className="text-muted-foreground">Nothing running low — bottles above 3 units, decant pools above {decantThreshold}ml.</p>
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
    </div>
  );
}
