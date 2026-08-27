import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { PageHeader, SectionCard, EmptyState } from "@/components/ui/section";
import { OrderStatusPill } from "@/components/ui/status-pill";
import { formatPHP } from "@/domain/money";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) return null;
  const rows = await db()
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id as string))
    .orderBy(desc(orders.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Orders"
        title="Your orders"
        subtitle="Receipts, payments, confirmations, and shipping — all in one place."
        actions={
          <Button asChild variant="outline">
            <Link href="/shop">Find another fragrance</Link>
          </Button>
        }
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
        <ul className="space-y-3">
          {rows.map((order) => (
            <li key={order.id}>
              <SectionCard
                eyebrow={order.orderNumber}
                title={formatPHP(order.totalCentavos)}
                description={`${order.fulfillmentMethod === "DELIVERY" ? "Delivery" : "Pickup"} · placed ${order.createdAt.toLocaleDateString()}`}
                actions={<OrderStatusPill status={order.status} />}
                contentClassName="flex flex-wrap items-center justify-between gap-3"
              >
                <p className="text-xs text-muted-foreground">
                  Order ID <span className="font-mono">{order.id.slice(0, 8)}</span>
                </p>
                <Button asChild variant="ghost" size="sm" className="ml-auto">
                  <Link href={`/account/orders/${order.id}`}>
                    View details
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </SectionCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}