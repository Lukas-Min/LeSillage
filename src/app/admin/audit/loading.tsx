import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAuditLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Audit log</h1>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
