import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { describeStatus } from "@/domain/order-state";
import { formatPHP } from "@/domain/money";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) return null;
  const client = db();
  const rows = await client
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id as string))
    .orderBy(desc(orders.createdAt));

  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Your orders</h1>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No orders yet.</CardContent>
        </Card>
      ) : (
        rows.map((order) => (
          <Card key={order.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-serif-display text-base">{order.orderNumber}</CardTitle>
              <Badge>{describeStatus(order.status)}</Badge>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                Total {formatPHP(order.totalCentavos)} ·{" "}
                {order.fulfillmentMethod === "DELIVERY" ? "Delivery" : "Pickup"} · placed{" "}
                {order.createdAt.toLocaleDateString()}
              </p>
              <p>
                <Link href={`/account/orders/${order.id}`} className="underline-offset-4 hover:underline">
                  View details
                </Link>
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}