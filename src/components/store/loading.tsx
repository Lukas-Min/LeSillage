import { Skeleton } from "@/components/ui/skeleton";

export function CatalogSkeleton() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-8 w-1/2" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="overflow-hidden rounded-2xl border">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="mt-4 h-8 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
