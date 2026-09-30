import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AreaHeader, PAGE_ACTION_CLASS } from "@/components/ui/page-layout";
import { ProductsListSkeleton } from "@/components/admin/products-skeleton";

export default function AdminProductsLoading() {
  return (
    <div className="space-y-6">
      <AreaHeader
        eyebrow="Admin"
        title="Products"
        actions={
          <>
            <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
              <Link href="/admin/products/fragrantica">Import from Fragrantica</Link>
            </Button>
            <Button asChild className={PAGE_ACTION_CLASS}>
              <Link href="/admin/products/new">New product</Link>
            </Button>
          </>
        }
      />
      <ProductsListSkeleton />
    </div>
  );
}
