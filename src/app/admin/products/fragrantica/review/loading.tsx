import { Skeleton } from "@/components/ui/skeleton";
export default function AdminFragranticaReviewLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-1/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
