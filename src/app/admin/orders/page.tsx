import Link from "next/link";
import { Suspense } from "react";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, receipts, users } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusPill } from "@/components/ui/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaHeader } from "@/components/ui/page-layout";
import { OrdersListSkeleton } from "@/components/admin/orders-skeleton";
import { formatPHP } from "@/domain/money";
import { OrderRowActions } from "@/components/admin/order-row-actions";
import { ORDER_STATUSES_BY_TIER, type OrderTier } from "@/domain/order-state";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
// The actions posted to this route send email inside after(); that work
// counts against the invocation's time budget, so leave room for the SMTP
// timeouts (8s each) instead of the 10s default.
export const maxDuration = 30;

const TABS: { value: OrderTier; label: string }[] = [
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

// Ongoing is the default, so it's left off the URL — matches /admin/promo's
// "settings" tab convention.
function tabHref(tab: OrderTier, userId?: string, orderId?: string) {
  const params = new URLSearchParams();
  if (tab !== "ONGOING") params.set("tab", tab.toLowerCase());
  if (userId) params.set("userId", userId);
  if (orderId) params.set("orderId", orderId);
  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; userId?: string; orderId?: string }>;
}) {
  const { tab: tabParam, userId, orderId } = await searchParams;
  const activeTab: OrderTier =
    tabParam === "completed" ? "COMPLETED" : tabParam === "cancelled" ? "CANCELLED" : "ONGOING";

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <AreaHeader eyebrow="Admin" title="Orders" />

      {/* Full width: a list has no secondary cards. flex-1 down to the empty
          message so it centres in the leftover height. */}
      <div className="flex flex-1 flex-col gap-4">
        <AdminTabs
          tabs={TABS.map((tab) => ({ ...tab, href: tabHref(tab.value, userId, orderId) }))}
          active={activeTab}
        />

        {/* Each tab fetches inside its own boundary, keyed to the tab (plus the
            userId/orderId filters): switching tabs is query-string navigation
            on this same route, which loading.tsx alone does not retrigger. */}
        <Suspense
          key={`${activeTab}:${userId ?? ""}:${orderId ?? ""}`}
          fallback={
            <>
              {orderId ? (
                <Link href={tabHref(activeTab)} className="text-xs text-muted-foreground hover:underline">
                  Showing this order · Clear filter
                </Link>
              ) : userId ? (
                <Skeleton className="h-4 w-full max-w-xs" />
              ) : null}
              <OrdersListSkeleton rows={orderId ? 1 : 3} tier={activeTab} />
            </>
          }
        >
          <OrdersTabContent tier={activeTab} userId={userId} orderId={orderId} />
        </Suspense>
      </div>
    </div>
  );
}

async function OrdersTabContent({
  tier,
  userId,
  orderId,
}: {
  tier: OrderTier;
  userId?: string;
  orderId?: string;
}) {
  const conditions = [];
  // A direct link to one specific order always shows that order, whichever
  // tier it's actually in, rather than risking "No matching orders" just
  // because it doesn't happen to fall under the currently-selected tab.
  if (!orderId) conditions.push(inArray(orders.status, ORDER_STATUSES_BY_TIER[tier]));
  if (userId) conditions.push(eq(orders.userId, userId));
  if (orderId) conditions.push(eq(orders.id, orderId));

  const [rows, customer] = await Promise.all([
    db()
      .select()
      .from(orders)
      .where(and(...conditions))
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
  const tierNoun = tier === "ONGOING" ? "ongoing" : tier === "COMPLETED" ? "completed" : "cancelled";
  // A customer filter still applies the selected tab, so the label says which
  // tab — otherwise "no orders" on Ongoing reads as "this customer has none".
  const filterLabel = orderId
    ? "this order"
    : customer
      ? `${tierNoun} orders for ${customer.name ?? customer.email}`
      : null;

  return (
    <>
      {filterLabel ? (
        <Link href={tabHref(tier)} className="text-xs text-muted-foreground hover:underline">
          Showing {filterLabel} · Clear filter
        </Link>
      ) : null}
      {rows.length === 0 ? (
        <Card className="flex min-h-48 flex-1 flex-col">
          <CardContent className="flex flex-1 flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {orderId
              ? "No matching orders."
              : filterLabel
                ? `No ${filterLabel} — check the other tabs.`
                : `No ${tierNoun} orders yet.`}
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
          <CardHeader className="pointer-events-none flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{order.orderNumber}</CardTitle>
            <OrderStatusPill status={order.status} />
          </CardHeader>
          <CardContent className="pointer-events-none space-y-2 text-sm">
            <p>
              {order.recipientName} · {order.email} · {order.phone} ·{" "}
              {order.fulfillmentMethod}
            </p>
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
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-1">
              <p className="text-xs text-muted-foreground">Placed {formatDate(order.createdAt)}</p>
              <p className="shrink-0 font-price-display text-lg font-semibold tabular-nums">
                {formatPHP(order.totalCentavos)}
              </p>
            </div>
            <div className="pointer-events-auto relative z-10">
              <OrderRowActions
                orderId={order.id}
                status={order.status}
                fulfillmentMethod={order.fulfillmentMethod}
                promoTesterResult={order.promoTesterResult}
                cancellationRequestedAt={order.cancellationRequestedAt}
                cancellationRequestReason={order.cancellationRequestReason}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
