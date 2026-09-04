import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function CheckoutLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="font-serif-display text-2xl">Checkout</h1>
      <p className="text-sm text-muted-foreground">All amounts shown are in Philippine pesos (₱).</p>
      <div className="mt-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </main>
  );
}
