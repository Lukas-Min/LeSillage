import { Skeleton } from "@/components/ui/skeleton";
export default function AdminProductLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-1/3" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
