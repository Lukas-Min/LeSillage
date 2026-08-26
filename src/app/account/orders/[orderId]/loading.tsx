import { Skeleton } from "@/components/ui/skeleton";
export default function OrderDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
