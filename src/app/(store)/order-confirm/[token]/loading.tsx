import { PageHeader, SectionCard } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderConfirmLoading() {
  return (
    <main className="w-full px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <div className="mx-auto max-w-xl space-y-6">
        {/* The order number subtitle depends on the token lookup, so it's
            left out here rather than skeletoned in place of a subtitle
            that might not exist at all (an invalid token has no order). */}
        <PageHeader eyebrow="Delivery" title="Did your order arrive?" />
        <SectionCard eyebrow="Confirm receipt" title="One tap and you're done">
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-9 w-40" />
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
