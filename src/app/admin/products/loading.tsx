import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProductsLoading() {
  return (
    <div className="flex flex-1 flex-col space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif-display text-2xl">Products</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/products/new" className="text-xs text-muted-foreground hover:underline">
            Add manually
          </Link>
          <Button asChild>
            <Link href="/admin/products/fragrantica">New product</Link>
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {["All", "Decants", "Full bottles", "Partials"].map((label) => (
          <span key={label} className="min-h-11 border-b-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </span>
        ))}
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
