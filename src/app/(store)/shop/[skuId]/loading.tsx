import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <Skeleton className="h-3 w-40" />
      <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 md:divide-x md:divide-border/60">
        <div className="flex flex-col gap-6 md:pr-12">
          <Skeleton className="aspect-square w-full rounded-md" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="flex flex-col gap-6 md:pl-12">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-11 w-11 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-11 w-full" />
          <div className="space-y-3 border-t border-border/60 pt-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
