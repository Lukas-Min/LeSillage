import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProductsLoading() {
  return (
    <div className="flex flex-1 flex-col space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif-display text-2xl">Products</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/products/fragrantica" className="text-xs text-muted-foreground hover:underline">
            Import from Fragrantica
          </Link>
          <Button asChild>
            <Link href="/admin/products/new">New product</Link>
          </Button>
        </div>
      </div>
      <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto border-b border-border">
        {["All", "Decants", "Full bottles", "Partials"].map((label) => (
          <span key={label} className="min-h-11 shrink-0 border-b-2 border-transparent px-3 py-2 text-xs uppercase tracking-[0.15em] whitespace-nowrap text-muted-foreground">
            {label}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
        <div className="flex w-full sm:max-w-xs">
          <Input type="search" placeholder="Search by brand or name…" disabled className="h-11 rounded-r-none border-r-0" />
          <Button type="button" variant="gold" size="icon-lg" disabled className="h-11 w-11 shrink-0 rounded-l-none rounded-r-lg">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
