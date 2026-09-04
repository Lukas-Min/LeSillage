import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderItems, receipts, users, skus } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { describeStatus } from "@/domain/order-state";
import { formatPHP } from "@/domain/money";
import { OrderRowActions } from "@/components/admin/order-row-actions";

export const dynamic = "force-dynamic";

type AddressSnapshot = {
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  postalCode?: string;
  street?: string;
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = (await db().select().from(orders).where(eq(orders.id, orderId)))[0];
  if (!order) return notFound();

  const [items, customer, receiptRows, testerSku] = await Promise.all([
    db().select().from(orderItems).where(eq(orderItems.orderId, orderId)),
    db()
      .select({ id: users.id, email: users.email, name: users.name, phone: users.phone })
      .from(users)
      .where(eq(users.id, order.userId))
      .then((r) => r[0]),
    db()
      .select({ blobUrl: receipts.blobUrl, submittedAt: receipts.submittedAt, note: receipts.note })
      .from(receipts)
      .where(eq(receipts.orderId, orderId))
      .orderBy(desc(receipts.submittedAt)),
    order.promoTesterSkuId
      ? db()
          .select({ label: skus.label, productId: skus.productId })
          .from(skus)
          .where(eq(skus.id, order.promoTesterSkuId))
          .then((r) => r[0])
      : Promise.resolve(undefined),
  ]);

  const address = (order.addressSnapshot ?? null) as AddressSnapshot | null;
  const latestReceipt = receiptRows[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif-display text-2xl">{order.orderNumber}</h1>
        <Badge variant="outline" className="h-auto px-3 py-1.5 text-sm">
          {describeStatus(order.status)}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <OrderRowActions orderId={order.id} status={order.status} />
      </div>
      {order.statusReason ? <p className="text-sm text-destructive">Reason: {order.statusReason}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Recipient:</span> {order.recipientName}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {order.email}
          </p>
          <p>
            <span className="text-muted-foreground">Phone:</span> {order.phone}
          </p>
          <p>
            <span className="text-muted-foreground">Account:</span>{" "}
            {customer ? (
              <Link href={`/admin/customers/${customer.id}`} className="underline underline-offset-4 hover:text-foreground">
                {customer.name ?? customer.email}
              </Link>
            ) : (
              "—"
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {order.fulfillmentMethod === "PICKUP" ? "Pickup" : "Delivery"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {order.fulfillmentMethod === "PICKUP" ? (
            <p>{order.pickupNotes || "No pickup instructions given."}</p>
          ) : address ? (
            <p>
              {[address.street, address.barangay, address.city, address.province, address.region, address.postalCode]
                .filter(Boolean)
                .join(", ")}
            </p>
          ) : (
            <p className="text-muted-foreground">No address on file.</p>
          )}
          {order.notes ? (
            <p>
              <span className="text-muted-foreground">Order notes:</span> {order.notes}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Placed {order.createdAt.toLocaleString()} · Last updated {order.statusUpdatedAt.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={
                index < items.length - 1
                  ? "flex items-start justify-between gap-3 border-b border-border/60 pb-3"
                  : "flex items-start justify-between gap-3"
              }
            >
              <div className="min-w-0">
                <p className="font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.skuLabel} · {item.fulfillment === "PRE_ORDER" ? "Pre-order" : "On hand"} · qty {item.quantity}
                </p>
                {item.discountCentavos > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {formatPHP(item.originalUnitCentavos)} → {formatPHP(item.unitPriceCentavos)} each (saved{" "}
                    {formatPHP(item.discountCentavos)})
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 font-medium tabular-nums">{formatPHP(item.lineTotalCentavos)}</p>
            </div>
          ))}
          <div className="space-y-1 border-t border-border/60 pt-3 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatPHP(order.subtotalCentavos)}</span>
            </p>
            {order.discountCentavos > 0 ? (
              <p className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="tabular-nums">-{formatPHP(order.discountCentavos)}</span>
              </p>
            ) : null}
            <p className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="tabular-nums">{order.deliveryFeeCentavos === 0 ? "Free" : formatPHP(order.deliveryFeeCentavos)}</span>
            </p>
            <p className="flex justify-between font-medium">
              <span>Total</span>
              <span className="tabular-nums">{formatPHP(order.totalCentavos)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {order.promoTesterResult ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tester bonus</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {order.promoTesterResult === "ASSIGNED" && testerSku ? (
              <p>
                Assigned: {testerSku.label}{" "}
                <Link href={`/admin/products/${testerSku.productId}`} className="underline underline-offset-4 hover:text-foreground">
                  (view product)
                </Link>
              </p>
            ) : (
              <p className="text-muted-foreground">
                {order.promoTesterResult === "PENDING" ? "Pending — no matching tester was in stock yet." : "Skipped."}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receipt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {latestReceipt ? (
            <>
              <a
                href={latestReceipt.blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-medium text-primary underline underline-offset-4"
              >
                View uploaded receipt
              </a>
              <p className="text-xs text-muted-foreground">Submitted {latestReceipt.submittedAt.toLocaleString()}</p>
              {latestReceipt.note ? <p className="text-xs text-muted-foreground">Note: {latestReceipt.note}</p> : null}
              {receiptRows.length > 1 ? (
                <p className="text-xs text-muted-foreground">
                  {receiptRows.length - 1} earlier receipt{receiptRows.length > 2 ? "s" : ""} also on file (retries).
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">No receipt uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
