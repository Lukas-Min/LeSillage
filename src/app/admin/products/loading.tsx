import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductsListSkeleton } from "@/components/admin/products-skeleton";

export default function AdminProductsLoading() {
  return (
    <div className="flex flex-1 flex-col space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif-display text-2xl">Products</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/products/fragrantica" className="text-xs text-muted-foreground hover:underline">
            Import from Fragrantica
          </Link>
          <Button asChild>
            <Link href="/admin/products/new">New product</Link>
          </Button>
        </div>
      </div>
      <ProductsListSkeleton />
    </div>
  );
}
