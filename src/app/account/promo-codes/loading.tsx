import { PageHeader } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountPromoCodesLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Orders"
        title="Promo codes"
        subtitle="Codes for everyone, and any code made just for you. Tap one to copy it."
      />
      <Skeleton className="h-11 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}
