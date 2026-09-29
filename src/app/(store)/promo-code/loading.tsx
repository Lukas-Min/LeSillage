import { Skeleton } from "@/components/ui/skeleton";

export default function PromoCodeCopyLoading() {
  return (
    <main className="mx-auto w-full max-w-lg space-y-4 px-4 py-10">
      <h1 className="font-serif-display text-3xl">Your promo code</h1>
      <div className="space-y-3">
        <Skeleton className="h-11 w-full sm:w-36" />
        <p className="text-sm text-muted-foreground">Tap the code to copy it.</p>
      </div>
    </main>
  );
}
