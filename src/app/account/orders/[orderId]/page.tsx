import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders, orderItems } from "@/db/schema";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { OrderStatusPill } from "@/components/ui/status-pill";
import { Price } from "@/components/store/price";
import { ReceiptUploader } from "@/components/store/receipt-uploader";
import { CancelOrderButton } from "@/components/store/cancel-order-button";
import { describeStatus, canTransition } from "@/domain/order-state";
import { formatPHP } from "@/domain/money";
import { computeEtaSummary } from "@/domain/eta";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const session = await auth();
  if (!session?.user) return notFound();
  const client = db();
  const order = (
    await client
      .select()
      .from(orders)
      .where(
        and(eq(orders.userId, session.user.id as string), eq(orders.id, orderId)),
      )
  )[0];
  if (!order) return notFound();
  const items = await client.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const eta = computeEtaSummary(
    items.map((it) => ({ fulfillment: it.fulfillment, orderedAt: order.createdAt })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={order.orderNumber}
        title={formatPHP(order.totalCentavos)}
        subtitle={`Placed ${order.createdAt.toLocaleString()} · ${order.fulfillmentMethod === "DELIVERY" ? "Delivery" : "Pickup"}`}
        actions={
          <>
            <OrderStatusPill status={order.status} />
            {canTransition(order.status, "CANCELLED") ? <CancelOrderButton orderId={order.id} /> : null}
            <Button asChild variant="outline" size="sm">
              <Link href="/account/orders">
                <ArrowLeft className="h-4 w-4" />
                All orders
              </Link>
            </Button>
          </>
        }
      />

      {order.statusReason ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {order.statusReason}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          eyebrow="Items"
          title={`${items.length} ${items.length === 1 ? "line" : "lines"}`}
          contentClassName="space-y-3"
        >
          <ul className="divide-y divide-border/60">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-serif-display text-base leading-tight">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.skuLabel} · × {item.quantity}
                  </p>
                </div>
                <Price
                  originalCentavos={item.originalUnitCentavos}
                  discountedCentavos={item.unitPriceCentavos}
                  savedCentavos={item.discountCentavos}
                  quantity={item.quantity}
                />
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-border/60 pt-3 text-sm">
            {/* subtotalCentavos and deliveryFeeCentavos already have every
                discount (item, promo-code order, promo-code delivery) baked
                in — totalCentavos is exactly their sum, nothing further to
                subtract here. discountCentavos below is shown separately as
                an informational "amount saved" figure, not as a deduction,
                so this can't misread as double-discounting. */}
            <p className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPHP(order.subtotalCentavos)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <Price
                originalCentavos={12000}
                discountedCentavos={order.deliveryFeeCentavos}
                savedCentavos={12000 - order.deliveryFeeCentavos}
                suffix="Free when applicable"
              />
            </p>
            <p className="flex justify-between border-t border-border/60 pt-2 font-serif-display text-base">
              <span>Total</span>
              <span>{formatPHP(order.totalCentavos)}</span>
            </p>
            {order.discountCentavos > 0 ? (
              <p className="flex justify-between text-xs text-muted-foreground">
                <span>You saved</span>
                <span>{formatPHP(order.discountCentavos)}</span>
              </p>
            ) : null}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            eyebrow="Status"
            title={describeStatus(order.status)}
            description="Updated by the team as your order moves through verification and shipping."
          >
            <ol className="space-y-2 text-sm">
              {[
                { label: "Awaiting payment", status: "AWAITING_PAYMENT" },
                { label: "Receipt submitted", status: "RECEIPT_SUBMITTED" },
                { label: "Confirmed", status: "CONFIRMED" },
                { label: "Shipped", status: "SHIPPED" },
                { label: "Completed", status: "COMPLETED" },
              ].map((step) => (
                <li
                  key={step.status}
                  className={
                    step.status === order.status
                      ? "font-medium text-gold"
                      : "text-muted-foreground"
                  }
                >
                  {step.label}
                </li>
              ))}
            </ol>
          </SectionCard>
          <SectionCard eyebrow="Estimated arrival" title="When to expect it">
            <ul className="space-y-1 text-sm">
              {eta.map((range, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
                  {range.label}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      {order.status === "AWAITING_PAYMENT" || order.status === "REJECTED" ? (
        <SectionCard
          eyebrow="Payment"
          title="Upload a receipt"
          description="Upload a screenshot of your bank or e-wallet transfer. Stock is reserved as soon as we verify it."
        >
          <ReceiptUploader orderId={order.id} />
        </SectionCard>
      ) : null}
    </div>
  );
}