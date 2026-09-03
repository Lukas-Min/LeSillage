import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCustomersLoading() {
  return (
    <div className="flex flex-1 flex-col space-y-4">
      <h1 className="font-serif-display text-2xl">Customers</h1>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
