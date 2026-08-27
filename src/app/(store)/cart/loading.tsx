import { Skeleton } from "@/components/ui/skeleton";
export default function CartLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Skeleton className="h-7 w-1/3" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </main>
  );
}
