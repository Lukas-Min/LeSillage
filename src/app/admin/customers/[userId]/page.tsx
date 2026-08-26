import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, orders } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPHP } from "@/domain/money";
import { describeStatus } from "@/domain/order-state";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = (await db().select().from(users).where(eq(users.id, userId)))[0];
  if (!user) return notFound();
  const rows = await db()
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">{user.email}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Name: {user.name ?? "—"}</p>
          <p>Role: {user.role}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No orders.</p>
          ) : (
            rows.map((order) => (
              <p key={order.id} className="flex items-center justify-between border-t pt-1">
                <span>
                  {order.orderNumber} · {describeStatus(order.status)}
                </span>
                <span>{formatPHP(order.totalCentavos)}</span>
              </p>
            ))
          )}
        </CardContent>
      </Card>
      <Badge variant="outline">{user.role}</Badge>
    </div>
  );
}
