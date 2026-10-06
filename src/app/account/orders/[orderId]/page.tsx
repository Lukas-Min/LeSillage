import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { AlertCircle } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders, orderItems, productImages, skus } from "@/db/schema";
import { SectionCard } from "@/components/ui/section";
import { AreaHeader, PageColumns } from "@/components/ui/page-layout";
import { formatOrderStatus, OrderStatusPill } from "@/components/ui/status-pill";
import { ReceiptUploader } from "@/components/store/receipt-uploader";
import { PaymentWindowTimer } from "@/components/store/payment-window-timer";
import { CancelOrderButton } from "@/components/store/cancel-order-button";
import { ReorderButton } from "@/components/store/reorder-button";
import { ConfirmReceivedButton } from "@/components/store/confirm-received-button";
import { AskAboutOrderButton } from "@/components/store/ask-about-order-button";
import { describeStatus, customerCancelMode, isTerminal } from "@/domain/order-state";
import { isDueForAutoReject, paymentDeadline } from "@/domain/auto-reject";
import { paymentReminderTime } from "@/domain/payment-reminder";
import { expireUnpaidOrderIfDue } from "@/lib/orders";
import { DEFAULT_DELIVERY_FEE_CENTAVOS, formatPHP } from "@/domain/money";
import { getEnv } from "@/lib/env";
import { instagramChatUrl, messengerChatUrl } from "@/lib/social-links";
import { formatDateTime } from "@/lib/utils";
import { computeEtaSummary } from "@/domain/eta";
import { summarizeOrderTotals } from "@/domain/order-summary";
import {
  canRevealPickupAddress,
  pickupAddressPlaceholder,
  PICKUP_ADDRESS_LINE,
  PICKUP_ADDRESS_NAME,
} from "@/domain/pickup";

export const dynamic = "force-dynamic";
// The actions posted to this route send email inside after(); that work
// counts against the invocation's time budget, so leave room for the SMTP
// timeouts (8s each) instead of the 10s default.
export const maxDuration = 30;

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
  if (
    isDueForAutoReject({
      status: order.status,
      statusUpdatedAt: order.statusUpdatedAt,
      now: new Date(),
    })
  ) {
    await expireUnpaidOrderIfDue(order.id, session.user.id as string);
    redirect(`/account/orders/${order.id}`);
  }
  const items = await client.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const summary = summarizeOrderTotals({
    lines: items,
    subtotalCentavos: order.subtotalCentavos,
    deliveryFeeCentavos: order.deliveryFeeCentavos,
    totalCentavos: order.totalCentavos,
    discountCentavos: order.discountCentavos,
  });
  const imageBySku = new Map<string, { url: string; alt: string | null }>();
  const skuIds = [...new Set(items.map((item) => item.skuId))];
  if (skuIds.length > 0) {
    const imageRows = await client
      .select({
        skuId: skus.id,
        url: productImages.url,
        alt: productImages.alt,
      })
      .from(skus)
      .innerJoin(productImages, eq(productImages.productId, skus.productId))
      .where(inArray(skus.id, skuIds))
      .orderBy(asc(productImages.position));
    for (const row of imageRows) {
      if (!imageBySku.has(row.skuId)) imageBySku.set(row.skuId, { url: row.url, alt: row.alt });
    }
  }
  const eta = computeEtaSummary(
    items.map((it) => ({ fulfillment: it.fulfillment, orderedAt: order.createdAt })),
  );
  // The timeline's middle steps branch on fulfillment method: a delivery
  // order ships then gets marked delivered, while a pickup order gets one
  // "ready for pickup" step instead — see src/domain/order-state.ts for why
  // those are parallel, not sequential.
  const timelineSteps =
    order.fulfillmentMethod === "PICKUP"
      ? [
          { label: "Awaiting payment", status: "AWAITING_PAYMENT" as const },
          { label: "Receipt submitted", status: "RECEIPT_SUBMITTED" as const },
          { label: "Confirmed", status: "CONFIRMED" as const },
          { label: "Ready for pickup", status: "READY_FOR_PICKUP" as const },
          { label: "Completed", status: "COMPLETED" as const },
        ]
      : [
          { label: "Awaiting payment", status: "AWAITING_PAYMENT" as const },
          { label: "Receipt submitted", status: "RECEIPT_SUBMITTED" as const },
          { label: "Confirmed", status: "CONFIRMED" as const },
          { label: "Shipped", status: "SHIPPED" as const },
          { label: "Delivered", status: "DELIVERED" as const },
          { label: "Completed", status: "COMPLETED" as const },
        ];
  const revealPickup = canRevealPickupAddress(order.status);
  const pickupHidden = pickupAddressPlaceholder(order.status);
  const orderUrl = `${getEnv().NEXT_PUBLIC_APP_URL}/account/orders/${order.id}`;
  const askMessage = [
    `Order ID: ${order.orderNumber}`,
    `Order Status: ${formatOrderStatus(order.status)}`,
    `Type: ${order.fulfillmentMethod === "PICKUP" ? "Pickup" : "Delivery"}`,
    `Total: ${formatPHP(order.totalCentavos)}`,
    `View Order: ${orderUrl}`,
    "",
    "",
  ].join("\n");

  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Order"
        title={order.orderNumber}
        badge={<OrderStatusPill status={order.status} />}
        subtitle={`Placed ${formatDateTime(order.createdAt)} · ${order.fulfillmentMethod === "DELIVERY" ? "Delivery" : "Pickup"}`}
        actions={
          <>
            <AskAboutOrderButton
              messengerUrl={messengerChatUrl(askMessage)}
              instagramUrl={instagramChatUrl(askMessage)}
            />
            {order.status === "DELIVERED" ? <ConfirmReceivedButton orderId={order.id} /> : null}
            {customerCancelMode(order.status) || order.cancellationRequestedAt ? (
              <CancelOrderButton
                orderId={order.id}
                status={order.status}
                cancellationRequestedAt={order.cancellationRequestedAt}
              />
            ) : null}
            {isTerminal(order.status) ? <ReorderButton orderId={order.id} /> : null}
          </>
        }
      />

      {order.statusReason ? (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-destructive">
              {order.status === "REJECTED" ? "Order rejected" : "Order cancelled"}
            </p>
            <p className="text-sm text-destructive/90">{order.statusReason}</p>
          </div>
        </div>
      ) : null}

      <PageColumns
        sideLabel="Order progress"
        side={
          <>
            <SectionCard
              eyebrow="Status"
              title={describeStatus(order.status)}
              description="Updated by the team as your order moves through verification and shipping."
            >
              <ol className="space-y-2 text-sm">
                {timelineSteps.map((step) => (
                  <li
                    key={step.status}
                    className={
                      step.status === order.status
                        ? "font-medium text-gold-ink"
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
            {order.fulfillmentMethod === "PICKUP" ? (
              <SectionCard
                eyebrow="Pickup"
                title={revealPickup ? PICKUP_ADDRESS_NAME : pickupHidden.title}
                description={
                  revealPickup
                    ? `Search "${PICKUP_ADDRESS_NAME}" on Google Maps or Apple Maps to find it.`
                    : pickupHidden.description
                }
              >
                {revealPickup ? <p className="text-sm">{PICKUP_ADDRESS_LINE}</p> : null}
                {order.pickupNotes ? (
                  <p className="text-sm text-muted-foreground">Your instructions: {order.pickupNotes}</p>
                ) : null}
              </SectionCard>
            ) : null}
          </>
        }
        main={
          <>
            <SectionCard
              className="flex flex-col"
              eyebrow="Items"
              contentClassName="flex flex-1 flex-col space-y-0"
            >
              <ul>
                {items.map((item) => {
                  const image = imageBySku.get(item.skuId);
                  return (
                    <li key={item.id} className="flex gap-3 py-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border/60 bg-white">
                        {image ? (
                          // Plain img, same as the shop card, so a missing host does not break the page.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image.url}
                            alt={image.alt ?? item.productName}
                            className="h-full w-full object-contain"
                          />
                        ) : null}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div>
                          <p className="font-serif-display text-base leading-tight">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.skuLabel} · × {item.quantity}
                          </p>
                        </div>
                        <span className="text-sm tabular-nums sm:shrink-0">
                          {item.discountCentavos > 0 ? (
                            <span className="inline-flex items-baseline gap-2">
                              <s className="text-muted-foreground">{formatPHP(item.originalUnitCentavos * item.quantity)}</s>
                              <span>{formatPHP(item.lineTotalCentavos)}</span>
                            </span>
                          ) : (
                            formatPHP(item.lineTotalCentavos)
                          )}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-auto border-t border-border/60 text-sm">
                {/* Subtotal is the lines above (item discounts already in their
                    prices); a promo code comes off on its own line, and "You saved"
                    below is every saving combined, shown but not subtracted
                    (summarizeOrderTotals). */}
                <p className="flex justify-between py-3">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPHP(summary.itemsCentavos)}</span>
                </p>
                {summary.promoCodeCentavos > 0 ? (
                  <p className="flex justify-between py-3">
                    <span className="text-muted-foreground">Promo code</span>
                    <span>-{formatPHP(summary.promoCodeCentavos)}</span>
                  </p>
                ) : null}
                <p className="flex justify-between gap-3 py-3">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="text-right">
                    {order.fulfillmentMethod === "PICKUP" ? (
                      "Free · Pickup"
                    ) : order.deliveryFeeCentavos === 0 ? (
                      <span className="inline-flex items-baseline gap-2">
                        <s className="text-muted-foreground">{formatPHP(DEFAULT_DELIVERY_FEE_CENTAVOS)}</s>
                        <span>Free</span>
                      </span>
                    ) : (
                      formatPHP(order.deliveryFeeCentavos)
                    )}
                  </span>
                </p>
                <p className="flex items-baseline justify-between border-t border-border/60 py-3">
                  <span className="font-serif-display text-lg">Total</span>
                  <span className="font-price-display text-2xl">{formatPHP(order.totalCentavos)}</span>
                </p>
                {order.discountCentavos > 0 ? (
                  <p className="flex justify-between text-xs text-muted-foreground">
                    <span>You saved</span>
                    <span>{formatPHP(order.discountCentavos)}</span>
                  </p>
                ) : null}
              </div>
            </SectionCard>
            {order.status === "AWAITING_PAYMENT" ? (
              <SectionCard
                eyebrow="Payment"
                title="Upload a receipt"
                description="On-hand stock is held for one hour. Upload your receipt in that hour or the order is cancelled."
              >
                <PaymentWindowTimer
                  orderId={order.id}
                  deadline={paymentDeadline(order.statusUpdatedAt).toISOString()}
                  remindAt={paymentReminderTime(order.statusUpdatedAt).toISOString()}
                  now={new Date().toISOString()}
                >
                  <ReceiptUploader orderId={order.id} />
                </PaymentWindowTimer>
              </SectionCard>
            ) : order.status === "REJECTED" ? (
              <SectionCard
                eyebrow="Payment"
                title="Upload a receipt"
                description="Upload a new screenshot of your transfer."
              >
                <ReceiptUploader orderId={order.id} />
              </SectionCard>
            ) : null}
          </>
        }
      />
    </div>
  );
}