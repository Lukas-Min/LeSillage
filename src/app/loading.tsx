import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow } from "@/components/ui/section";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-12">
      <div className="space-y-2">
        <Eyebrow>Loading</Eyebrow>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
        ))}
      </div>
    </main>
  );
}