import { sql, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, skus } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function countWhere(table: typeof orders | typeof skus, where: ReturnType<typeof eq>) {
  return db()
    .select({ c: sql<number>`count(*)` })
    .from(table)
    .where(where);
}

export default async function AdminDashboard() {
  const client = db();
  const [pendingRow, awaitingRow, lowStock] = await Promise.all([
    countWhere(orders, eq(orders.status, "RECEIPT_SUBMITTED")),
    countWhere(orders, eq(orders.status, "AWAITING_PAYMENT")),
    client
      .select()
      .from(skus)
      .where(sql`${skus.stock} <= 3 AND ${skus.fulfillment} = 'ON_HAND' AND ${skus.isActive} = true`),
  ]);
  const pending = pendingRow[0]?.c ?? 0;
  const awaiting = awaitingRow[0]?.c ?? 0;
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
            <CardTitle className="text-sm">Low stock SKUs</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{lowStock.length}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Low stock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {lowStock.length === 0 ? (
            <p className="text-muted-foreground">All on-hand SKUs above 3 units.</p>
          ) : (
            lowStock.map((s) => (
              <p key={s.id}>
                {s.sku} — {s.label} — {s.stock} left
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
