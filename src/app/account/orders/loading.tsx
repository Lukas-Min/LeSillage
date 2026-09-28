import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/section";

export default function OrdersLoading() {
  return (
    <div className="flex flex-1 flex-col space-y-6">
      <PageHeader
        eyebrow="Orders"
        title="Your orders"
        subtitle="Receipts, payments, confirmations, and shipping — all in one place."
      />
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
