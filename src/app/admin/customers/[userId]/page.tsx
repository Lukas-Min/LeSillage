import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, orders, promoCodes } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusPill } from "@/components/ui/status-pill";
import { formatPHP } from "@/domain/money";
import { formatDate } from "@/lib/utils";
import { isAllowedFor, withAllowedUsers } from "@/lib/promo-code-access";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = (await db().select().from(users).where(eq(users.id, userId)))[0];
  if (!user) return notFound();
  const [rows, codes] = await Promise.all([
    db().select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)),
    db()
      .select()
      .from(promoCodes)
      .orderBy(desc(promoCodes.createdAt))
      .then((rows) => withAllowedUsers(rows))
      .then((rows) => rows.filter((code) => isAllowedFor(code.allowedUserIds, userId))),
  ]);

  const completedOrders = rows.filter((o) => o.status === "COMPLETED");
  const totalSpentCentavos = completedOrders.reduce((sum, o) => sum + o.totalCentavos, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif-display text-2xl">{user.name ?? user.email}</h1>
        {user.name ? <p className="text-sm text-muted-foreground">{user.email}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Orders</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{rows.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Completed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{completedOrders.length}</CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Total spent</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatPHP(totalSpentCentavos)}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Email:</span> {user.email}
          </p>
          <p>
            <span className="text-muted-foreground">Name:</span> {user.name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Phone:</span> {user.phone ?? "—"}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Role:</span> <Badge variant="outline">{user.role}</Badge>
          </p>
          <p>
            <span className="text-muted-foreground">Marketing opt-in:</span> {user.marketingOptIn ? "Yes" : "No"}
          </p>
          <p>
            <span className="text-muted-foreground">Joined:</span> {formatDate(user.createdAt)}
          </p>
          {user.deletedAt ? (
            <p className="text-destructive sm:col-span-2">Account deleted {formatDate(user.deletedAt)}</p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Promo codes</CardTitle>
          <CardAction>
            <Button asChild className="h-11">
              <Link href={`/admin/customers/${user.id}/promo-codes/new`}>Add</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {codes.length === 0 ? (
            <p className="text-muted-foreground">No codes for this customer.</p>
          ) : (
            <ul className="space-y-2">
              {codes.map((code) => (
                <li key={code.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
                  <span className="font-price-display">{code.code}</span>
                  <span className="text-xs text-muted-foreground">
                    {code.type === "PERCENTAGE" ? `${code.amount}%` : formatPHP(code.amount)} off {code.scope === "ORDER" ? "the order" : "delivery"}
                    {code.maxRedemptions ? ` · ${code.redemptionCount}/${code.maxRedemptions} used` : ` · ${code.redemptionCount} used`}
                    {code.allowedUserIds.length === 0
                      ? " · everyone"
                      : code.allowedUserIds.length === 1
                        ? " · only this customer"
                        : ` · this customer and ${code.allowedUserIds.length - 1} other${code.allowedUserIds.length === 2 ? "" : "s"}`}
                    {code.isActive ? "" : " · inactive"}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 transition-colors hover:border-gold/40 hover:bg-muted/30"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{order.orderNumber}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <OrderStatusPill status={order.status} />
                  <span className="font-medium">{formatPHP(order.totalCentavos)}</span>
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
