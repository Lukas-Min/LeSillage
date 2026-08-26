import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { orders, qrCodes } from "@/db/schema";
import { ReceiptUploader } from "@/components/store/receipt-uploader";
import { Card, CardContent } from "@/components/ui/card";
import { formatPHP } from "@/domain/money";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?returnTo=/checkout");
  const { orderNumber } = await searchParams;
  if (!orderNumber) redirect("/shop");
  const client = db();
  const order = (
    await client
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, session.user.id as string),
          eq(orders.orderNumber, orderNumber),
        ),
      )
  )[0];
  if (!order) redirect("/account/orders");
  const qrs = await client
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.isActive, true))
    .orderBy(qrCodes.position);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-serif-display text-2xl">Pay via QR</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Order <span className="font-medium">{order.orderNumber}</span> · Total{" "}
        <span className="font-medium">{formatPHP(order.totalCentavos)}</span>
      </p>
      <Card className="mt-6">
        <CardContent className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            Scan any active QR code below using your banking or e-wallet app, then upload the
            receipt screenshot here.
          </p>
          {qrs.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm">
              No payment QR is configured yet. Your order is saved. Email us from the{" "}
              <Link href="/contact" className="underline-offset-4 hover:underline">
                contact page
              </Link>{" "}
              and we will send payment instructions. You can upload a receipt here as soon as a QR is added.
            </p>
          ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {qrs.map((qr) => (
              <div key={qr.id} className="rounded-lg border p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr.imageUrl} alt={`${qr.bankName} QR code`} className="mb-3 aspect-square w-full rounded bg-cream-foreground/5 object-contain" />
                <p className="text-sm font-medium">{qr.bankName}</p>
                <p className="text-xs text-muted-foreground">{qr.accountName} · {qr.accountNumber}</p>
                <a
                  href={qr.imageUrl}
                  download={`le-sillage-${qr.bankName.toLowerCase()}.png`}
                  className="mt-2 inline-block text-xs font-medium underline-offset-4 hover:underline"
                >
                  Download for mobile
                </a>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
      <ReceiptUploader orderId={order.id} />
      <p className="mt-6 text-xs text-muted-foreground">
        Stock is reserved only after your receipt is verified. If an item goes out of stock while
        you are paying, we will reach out to confirm a substitution or refund.
      </p>
      <p className="mt-3 text-xs">
        <Link href="/account/orders" className="underline-offset-4 hover:underline">
          View your orders
        </Link>
      </p>
    </main>
  );
}