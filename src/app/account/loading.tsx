import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow } from "@/components/ui/section";

export default function AccountLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Eyebrow>Account</Eyebrow>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}