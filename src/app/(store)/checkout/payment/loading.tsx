import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-serif-display text-2xl">Pay via QR</h1>
      {/* Order number/total come from the order lookup — shaped to match
          the real "Order X · Total ₱Y" line once it resolves. */}
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Card className="mt-6">
        <CardContent className="space-y-4 p-4">
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </CardContent>
      </Card>
      <Skeleton className="mt-6 h-32 w-full" />
    </main>
  );
}
