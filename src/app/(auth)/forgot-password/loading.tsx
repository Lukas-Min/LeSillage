import { Skeleton } from "@/components/ui/skeleton";
export default function ForgotPasswordLoading() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <Skeleton className="mt-6 h-40 w-full" />
    </main>
  );
}
