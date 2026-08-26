import { Skeleton } from "@/components/ui/skeleton";
export default function PaymentLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Skeleton className="h-7 w-1/3" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-6 h-64 w-full" />
      <Skeleton className="mt-6 h-32 w-full" />
    </main>
  );
}
