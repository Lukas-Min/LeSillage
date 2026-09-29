import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-serif-display text-2xl">Pay via QR</h1>
      {/* Order number/total come from the order lookup — shaped to match
          the real "Order X · Total ₱Y" line once it resolves. */}
      <div className="mt-2 flex h-5 items-center gap-1 text-sm text-muted-foreground">
        Order <Skeleton className="h-3.5 w-28" /> · Total <Skeleton className="h-3.5 w-16" />
      </div>
      <Card className="mt-6">
        <CardContent className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            Scan any active QR code below using your banking or e-wallet app, then upload the
            receipt screenshot here.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="rounded-lg border p-4">
                <Skeleton className="mb-3 aspect-square w-full rounded" />
                <Skeleton className="my-0.5 h-4 w-24" />
                <Skeleton className="my-0.5 h-3 w-40" />
                <Skeleton className="mt-2.5 h-3 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* ReceiptUploader: the heading is static; the file/note fields and
          Save only work once the order id resolves. */}
      <Card className="mt-6">
        <CardContent className="space-y-3 p-4">
          <h2 className="font-serif-display text-lg">Upload payment receipt</h2>
          <div className="space-y-3">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg sm:ml-auto sm:w-16" />
          </div>
        </CardContent>
      </Card>
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
