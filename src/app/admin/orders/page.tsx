import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { describeStatus } from "@/domain/order-state";
import { formatPHP } from "@/domain/money";
import { OrderRowActions } from "@/components/admin/order-row-actions";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const rows = await db().select().from(orders).orderBy(desc(orders.createdAt));
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Orders</h1>
      {rows.map((order) => (
        <Card key={order.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{order.orderNumber}</CardTitle>
            <Badge>{describeStatus(order.status)}</Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {order.recipientName} · {order.email} · {order.phone} ·{" "}
              {order.fulfillmentMethod}
            </p>
            <p>Total {formatPHP(order.totalCentavos)} · placed {order.createdAt.toLocaleString()}</p>
            {order.statusReason ? <p className="text-destructive">Reason: {order.statusReason}</p> : null}
            <OrderRowActions orderId={order.id} status={order.status} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}