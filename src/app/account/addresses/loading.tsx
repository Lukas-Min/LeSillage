import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/section";

export default function AddressLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Addresses"
        title="Where we ship to"
        subtitle="Save up to 5 addresses. Mark your default so checkout is one tap."
      />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
