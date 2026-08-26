import { Skeleton } from "@/components/ui/skeleton";
export default function BrandsLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-32 w-full" />
    </main>
  );
}
