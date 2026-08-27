import { Skeleton } from "@/components/ui/skeleton";
export default function FaqLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-9 w-1/2" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </main>
  );
}
