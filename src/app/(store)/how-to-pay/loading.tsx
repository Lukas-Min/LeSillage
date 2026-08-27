import { Skeleton } from "@/components/ui/skeleton";
export default function HowToPayLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-9 w-1/2" />
      <Skeleton className="h-48 w-full" />
    </main>
  );
}
