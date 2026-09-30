import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, orders, promoCodes } from "@/db/schema";
import { isPaidStatus } from "@/domain/order-state";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaHeader, MiniStat, MiniStats, PageColumns } from "@/components/ui/page-layout";
import { OrderStatusPill } from "@/components/ui/status-pill";
import { formatPHP } from "@/domain/money";
import { describePromoCodeAmounts } from "@/domain/promo-code";
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
  // Paid orders (confirmed onward), the same figure the customer sees under Account → Orders.
  const totalSpentCentavos = rows.filter((o) => isPaidStatus(o.status)).reduce((sum, o) => sum + o.totalCentavos, 0);

  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow={`Customer · Joined ${formatDate(user.createdAt)}`}
        title={user.name ?? user.email}
        badge={
          <>
            <Badge variant="outline">{user.role}</Badge>
            {user.deletedAt ? <Badge variant="secondary">Account deleted</Badge> : null}
          </>
        }
        subtitle={user.name ? <span className="break-words">{user.email}</span> : undefined}
      />
      {/* The customer's order numbers are the page's own content, so they run
          full width above the columns: two per row on a phone (Total spent
          spans both), three from sm. */}
      <MiniStats className="sm:grid-cols-3">
        <MiniStat label="Orders" value={rows.length} />
        <MiniStat label="Completed" value={completedOrders.length} />
        <MiniStat label="Total spent" value={formatPHP(totalSpentCentavos)} className="col-span-2 sm:col-span-1" />
      </MiniStats>
      <PageColumns
        main={
          <>
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
                          {describePromoCodeAmounts(code)}
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
          </>
        }
        sideLabel="Account"
        side={
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account</CardTitle>
              </CardHeader>
              {/* One column in the 22rem side column from xl. */}
              <CardContent className="grid grid-cols-1 gap-x-6 gap-y-2 break-words text-sm sm:grid-cols-2 xl:grid-cols-1">
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
                  <p className="text-destructive sm:col-span-2 xl:col-span-1">Account deleted {formatDate(user.deletedAt)}</p>
                ) : null}
              </CardContent>
            </Card>
          </>
        }
      />
    </div>
  );
}
