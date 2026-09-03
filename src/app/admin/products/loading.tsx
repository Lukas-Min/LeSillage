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
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
