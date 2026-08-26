import { Skeleton } from "@/components/ui/skeleton";
export default function ProductLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <Skeleton className="h-4 w-24" />
      <div className="mt-4 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      </div>
    </main>
  );
}
