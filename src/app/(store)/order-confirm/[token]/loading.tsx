import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderConfirmLoading() {
  return (
    <main className="w-full px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
      <div className="mx-auto max-w-xl space-y-6">
        {/* The order-number subtitle sits inside PageHeader's <p>, so it's a
            span rather than the div-based Skeleton. */}
        <PageHeader
          eyebrow="Delivery"
          title="Did your order arrive?"
          subtitle={<span className="skeleton-shine inline-block h-4 w-32 rounded-md bg-muted align-middle" />}
        />
        <SectionCard eyebrow="Confirm receipt" title="One tap and you're done">
          <div className="space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-11 w-40" />
          </div>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/contact">Something wrong? Contact us</Link>
          </Button>
        </SectionCard>
      </div>
    </main>
  );
}
