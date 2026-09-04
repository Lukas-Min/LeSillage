import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, receipts, users } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { describeStatus } from "@/domain/order-state";
import { formatPHP } from "@/domain/money";
import { OrderRowActions } from "@/components/admin/order-row-actions";

export const dynamic = "force-dynamic";
// The actions posted to this route send email inside after(); that work
// counts against the invocation's time budget, so leave room for the SMTP
// timeouts (8s each) instead of the 10s default.
export const maxDuration = 30;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; orderId?: string }>;
}) {
  const { userId, orderId } = await searchParams;
  const conditions = [];
  if (userId) conditions.push(eq(orders.userId, userId));
  if (orderId) conditions.push(eq(orders.id, orderId));

  const [rows, customer] = await Promise.all([
    db()
      .select()
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt)),
    userId
      ? db()
          .select({ id: users.id, email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, userId))
          .then((r) => r[0])
      : Promise.resolve(undefined),
  ]);
  const receiptRows =
    rows.length > 0
      ? await db()
          .select({ orderId: receipts.orderId, blobUrl: receipts.blobUrl, submittedAt: receipts.submittedAt })
          .from(receipts)
          .where(inArray(receipts.orderId, rows.map((r) => r.id)))
      : [];
  // Most recent receipt per order — a customer can retry after a stock
  // failure, leaving more than one row for the same order.
  const latestReceiptByOrder = new Map<string, { blobUrl: string; submittedAt: Date }>();
  for (const r of receiptRows) {
    const existing = latestReceiptByOrder.get(r.orderId);
    if (!existing || r.submittedAt > existing.submittedAt) {
      latestReceiptByOrder.set(r.orderId, { blobUrl: r.blobUrl, submittedAt: r.submittedAt });
    }
  }
  const filterLabel = orderId
    ? "this order"
    : customer
      ? `orders for ${customer.name ?? customer.email}`
      : null;
  return (
    <div className="flex flex-1 flex-col space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif-display text-2xl">Orders</h1>
        {filterLabel ? (
          <Link href="/admin/orders" className="text-xs text-muted-foreground hover:underline">
            Showing {filterLabel} · Clear filter
          </Link>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <Card className="flex flex-1 flex-col">
          <CardContent className="flex flex-1 flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {filterLabel ? "No matching orders." : "No orders yet."}
          </CardContent>
        </Card>
      ) : null}
      {rows.map((order) => (
        <Card key={order.id} className="relative">
          {/* Stretched-link pattern: covers the whole card so anywhere not
              occupied by a real interactive element navigates to the order.
              pointer-events-none on the header/content below lets clicks
              pass through to this link; the receipt link and action buttons
              explicitly re-enable pointer-events to stay clickable. */}
          <Link
            href={`/admin/orders/${order.id}`}
            className="absolute inset-0 z-0"
            aria-label={`View order ${order.orderNumber}`}
          />
          <CardHeader className="pointer-events-none flex flex-row items-center justify-between">
            <CardTitle className="text-base">{order.orderNumber}</CardTitle>
            <Badge variant="outline" className="h-auto px-3 py-1.5 text-sm">
              {describeStatus(order.status)}
            </Badge>
          </CardHeader>
          <CardContent className="pointer-events-none space-y-2 text-sm">
            <p>
              {order.recipientName} · {order.email} · {order.phone} ·{" "}
              {order.fulfillmentMethod}
            </p>
            <p>Total {formatPHP(order.totalCentavos)} · placed {order.createdAt.toLocaleString()}</p>
            {order.statusReason ? <p className="text-destructive">Reason: {order.statusReason}</p> : null}
            {latestReceiptByOrder.has(order.id) ? (
              <a
                href={latestReceiptByOrder.get(order.id)!.blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto relative z-10 inline-block text-xs font-medium text-primary underline underline-offset-4"
              >
                View uploaded receipt
              </a>
            ) : null}
            <div className="pointer-events-auto relative z-10">
              <OrderRowActions orderId={order.id} status={order.status} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}