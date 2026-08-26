import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders, orderItems } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { describeStatus } from "@/domain/order-state";
import { formatPHP } from "@/domain/money";
import { computeEtaSummary } from "@/domain/eta";
import { Price } from "@/components/store/price";
import { ReceiptUploader } from "@/components/store/receipt-uploader";

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
    <div className="space-y-4">
      <Link href="/account/orders" className="text-sm text-muted-foreground hover:underline">
        ← All orders
      </Link>
      <Card className={order.status === "RECEIPT_SUBMITTED" ? "watermark-pending" : ""}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif-display text-lg">{order.orderNumber}</CardTitle>
          <Badge>{describeStatus(order.status)}</Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {order.statusReason ? <p className="text-destructive">Reason: {order.statusReason}</p> : null}
          <p>Placed {order.createdAt.toLocaleString()}</p>
          <p>Fulfillment: {order.fulfillmentMethod === "DELIVERY" ? "Delivery" : "Pickup"}</p>
          <ul className="mt-2 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>
                  {item.productName} · {item.skuLabel} × {item.quantity}
                </span>
                <Price
                  originalCentavos={item.originalUnitCentavos}
                  discountedCentavos={item.unitPriceCentavos}
                  savedCentavos={item.discountCentavos}
                  quantity={item.quantity}
                />
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t pt-3 text-sm">
            <p className="flex justify-between"><span>Subtotal</span><span>{formatPHP(order.subtotalCentavos)}</span></p>
            <p className="flex justify-between"><span>Discount</span><span>-{formatPHP(order.discountCentavos)}</span></p>
            <p className="flex justify-between">
              <span>Delivery</span>
              <Price
                originalCentavos={12000}
                discountedCentavos={order.deliveryFeeCentavos}
                savedCentavos={12000 - order.deliveryFeeCentavos}
                suffix="Free when applicable"
              />
            </p>
            <p className="flex justify-between font-medium"><span>Total</span><span>{formatPHP(order.totalCentavos)}</span></p>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Estimated arrival</p>
            <ul className="text-sm">
              {eta.map((range, idx) => (
                <li key={idx}>{range.label}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
      {order.status === "AWAITING_PAYMENT" || order.status === "REJECTED" ? (
        <ReceiptUploader orderId={order.id} />
      ) : null}
    </div>
  );
}