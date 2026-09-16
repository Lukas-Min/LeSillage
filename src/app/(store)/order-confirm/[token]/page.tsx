import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { DeliveryConfirmForm } from "@/components/store/delivery-confirm-form";

export const dynamic = "force-dynamic";

// Public, no sign-in — reached straight from the day-2 follow-up email's
// "Yes, I received it" link, often tapped from a phone's mail app. The
// token itself is the only credential (an unguessable UUID minted on
// DELIVERED and cleared on COMPLETED, see src/lib/orders.ts), so there's
// nothing here that requires knowing who the visitor is.
export default async function OrderConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = (
    await db()
      .select({ orderNumber: orders.orderNumber, status: orders.status })
      .from(orders)
      .where(eq(orders.deliveryConfirmToken, token))
  )[0];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          eyebrow="Delivery"
          title="Did your order arrive?"
          subtitle={order ? `Order ${order.orderNumber}` : undefined}
        />
        <SectionCard eyebrow="Confirm receipt" title="One tap and you're done">
          {!order ? (
            <p className="text-sm text-muted-foreground">
              This link is no longer valid — it may have already been used, or the order has moved
              on since. Check your account for the latest status, or reach out if something looks
              wrong.
            </p>
          ) : order.status === "COMPLETED" ? (
            <p className="text-sm text-muted-foreground">
              This order is already marked as received. Thanks for confirming!
            </p>
          ) : order.status === "DELIVERED" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                We marked this order delivered a couple of days ago. Let us know it arrived safely.
              </p>
              <DeliveryConfirmForm token={token} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This order isn&apos;t awaiting a delivery confirmation right now. Check your account
              for its current status.
            </p>
          )}
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/contact">Something wrong? Contact us</Link>
          </Button>
        </SectionCard>
      </div>
    </main>
  );
}
