import { Skeleton } from "@/components/ui/skeleton";
export default function AdminFragranticaLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-1/3" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
