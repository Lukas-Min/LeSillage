import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders, type OrderStatus } from "@/db/schema";
import { SectionCard, EmptyState } from "@/components/ui/section";
import { AreaHeader, MiniStat, MiniStats, PageColumns } from "@/components/ui/page-layout";
import { OrderStatusPill } from "@/components/ui/status-pill";
import { ReorderButton } from "@/components/store/reorder-button";
import { formatPHP } from "@/domain/money";
import { isTerminal } from "@/domain/order-state";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// Orders whose payment the team has verified — what "Total spent" adds up.
// Awaiting payment, receipt submitted, rejected and cancelled don't count.
const PAID_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "READY_FOR_PICKUP",
  "COMPLETED",
]);

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) return null;
  const rows = await db()
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id as string))
    .orderBy(desc(orders.createdAt));

  const activeCount = rows.filter((order) => !isTerminal(order.status)).length;
  const spentCentavos = rows
    .filter((order) => PAID_STATUSES.has(order.status))
    .reduce((sum, order) => sum + order.totalCentavos, 0);

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <AreaHeader
        eyebrow="Orders"
        title="Your orders"
        subtitle="Receipts, payments, confirmations, and shipping — all in one place."
      />

      {rows.length === 0 ? (
        <EmptyState
          eyebrow="No orders yet"
          title="Your first order is one tap away"
          description="Browse the catalog to add a decant, partial, or full bottle to your cart."
          action={
            <Button asChild>
              <Link href="/shop">Visit the shop</Link>
            </Button>
          }
        />
      ) : (
        <PageColumns
          side={
            <SectionCard title="Summary">
              <MiniStats>
                <MiniStat label="Orders" value={rows.length} />
                <MiniStat label="Active" value={activeCount} hint="not finished yet" />
                <MiniStat
                  label="Total spent"
                  value={formatPHP(spentCentavos)}
                  hint="confirmed orders only"
                  className="col-span-2"
                />
              </MiniStats>
            </SectionCard>
          }
          main={
            <ul className="space-y-3">
              {rows.map((order) => (
                <li key={order.id} className="group relative">
                  <Link
                    href={`/account/orders/${order.id}`}
                    aria-label={`Order ${order.orderNumber}`}
                    className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <SectionCard
                    className="transition-colors group-hover:border-gold/50"
                    eyebrow={order.orderNumber}
                    title={formatPHP(order.totalCentavos)}
                    description={`${order.fulfillmentMethod === "DELIVERY" ? "Delivery" : "Pickup"} · placed ${formatDate(order.createdAt)}`}
                    actions={<OrderStatusPill status={order.status} />}
                    contentClassName="flex flex-wrap items-center justify-between gap-3"
                  >
                    <p className="text-xs text-muted-foreground">
                      Order ID <span className="font-mono">{order.id.slice(0, 8)}</span>
                    </p>
                    {isTerminal(order.status) ? (
                      <div className="relative z-20 ml-auto">
                        <ReorderButton orderId={order.id} />
                      </div>
                    ) : null}
                  </SectionCard>
                </li>
              ))}
            </ul>
          }
        />
      )}
    </div>
  );
}
