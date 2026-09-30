import Link from "next/link";
import { CartLineItemSkeleton } from "@/components/store/cart-line-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { policyCopy } from "@/lib/policy-copy";
import { cn } from "@/lib/utils";

/** Matches ProductCard (src/components/store/product-card.tsx) — square
 *  photo with its always-present category pill, brand/name/subtitle, the
 *  fulfillment badge, then the ruled-off price and the View button. The
 *  rating, Retail and Sold out extras are conditional per card, so they
 *  aren't reserved. `showSave` is for the deals rail, where every card has
 *  a Save badge and a struck original price. */
export function CatalogCardsSkeleton({ count = 20 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 min-[576px]:gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, idx) => (
        <CatalogCardSkeleton key={idx} />
      ))}
    </div>
  );
}

/** One ProductCard's shape — the grid above and the homepage rails. */
export function CatalogCardSkeleton({ showSave = false }: { showSave?: boolean }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-card">
      {/* The photo is one full shimmering block, like every other skeleton —
          not a white box: the real photo's white only exists once it loads,
          and a white slab reads as a broken image (glaring in dark mode). */}
      <div className="relative">
        <Skeleton className="aspect-square w-full rounded-none" />
        {showSave ? (
          <Skeleton className="absolute top-2 right-2 z-10 h-6 w-16 rounded-none border border-foreground/25 bg-background/90" />
        ) : null}
        <Skeleton className="absolute bottom-2 left-2 z-10 h-5 w-16 rounded-none border border-foreground/25 bg-background/90 min-[576px]:h-6 min-[576px]:w-20" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 min-[576px]:gap-1.5 min-[576px]:p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-4/5 min-[576px]:h-6" />
        <Skeleton className="h-5 w-1/2 min-[576px]:h-6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3 min-[576px]:hidden" />
        <div className="mt-auto space-y-2 pt-2 min-[576px]:space-y-3 min-[576px]:pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Skeleton className="h-5 w-16 rounded-none min-[576px]:h-6 min-[576px]:w-20" />
          </div>
          <div className="border-t border-border/60 pt-2 min-[576px]:pt-3">
            <div className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-1">
              {showSave ? <Skeleton className="h-3 w-12" /> : null}
              <Skeleton className="h-5 w-16 min-[576px]:h-6" />
            </div>
          </div>
        </div>
      </div>
      <div className="px-3 pb-3 min-[576px]:px-4 min-[576px]:pb-4">
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}

/** Matches CatalogPagination's page-1 shape (src/components/store/catalog-pagination.tsx) —
 *  no First/Prev yet, numbered pills at every size, plus Next (and Last on
 *  sm+). */
export function CatalogPaginationSkeleton() {
  return (
    <div className="mt-8 flex items-center justify-center gap-1.5">
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-11 w-11 rounded-md" />
        <Skeleton className="h-11 w-11 rounded-md" />
        <Skeleton className="h-11 w-11 rounded-md" />
      </div>
      <Skeleton className="h-11 w-11 rounded-md" />
      <Skeleton className="hidden h-11 w-11 rounded-md sm:block" />
    </div>
  );
}

/** Matches ShopToolbar's shape (src/components/store/shop-toolbar.tsx) —
 *  a left-aligned count line and right-aligned Filter/Sort buttons. */
export function ShopToolbarSkeleton() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Skeleton className="h-3 w-24" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 w-11 rounded-md min-[400px]:w-24" />
        <Skeleton className="h-11 w-11 rounded-md min-[400px]:w-20" />
      </div>
    </div>
  );
}

export function CatalogResultsSkeleton({
  count = 20,
  showCount = true,
  toolbar = false,
  pagination = true,
}: {
  count?: number;
  /** Set false wherever the real results view is rendered with its own
   *  `showCount={false}` (e.g. the shop page, whose `ShopToolbar` already
   *  shows the count) — otherwise this skeletons a count line that never
   *  actually appears. Ignored when `toolbar` is true. */
  showCount?: boolean;
  /** Set true wherever the real results view renders a `ShopToolbar` (count
   *  plus Filter/Sort buttons) instead of a plain count line — the shop page
   *  and its route-level loading.tsx. */
  toolbar?: boolean;
  /** Set false wherever the real results view has no `CatalogPagination`
   *  (e.g. /collections/[category], which loads every card in one page). */
  pagination?: boolean;
}) {
  return (
    <>
      {toolbar ? <ShopToolbarSkeleton /> : showCount ? <Skeleton className="mx-auto mb-6 h-3 w-24" /> : null}
      <CatalogCardsSkeleton count={count} />
      {pagination ? <CatalogPaginationSkeleton /> : null}
    </>
  );
}

/** The name / size · fulfillment / unit price rows and right-aligned line
 *  total that both the cart page's and checkout's Order summary list. */
export function SummaryLinesSkeleton({ count = 2, className }: { count?: number; className?: string }) {
  return (
    <ul className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="mt-0.5 h-4 w-16 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

/** Matches the cart page's filled state (src/app/(store)/cart/page.tsx) —
 *  line items, then the Order summary card with its static labels, footer
 *  and policy accordion rendered for real and only the amounts skeletoned. */
export function CartContentsSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <CartLineItemSkeleton layout="page" />
      <CartLineItemSkeleton layout="page" />
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle className="font-serif-display text-base">Order summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <SummaryLinesSkeleton />
          <Separator className="my-4" />
          <div className="space-y-1.5 text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <span>Delivery fee</span>
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="font-serif-display text-lg text-foreground">Total</span>
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="mt-3 space-y-1 border-t pt-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3 sm:w-1/3" />
            <Skeleton className="h-3 w-1/2 sm:hidden" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">Sign in is required to checkout.</p>
          <Button asChild variant="gold" size="lg" className="h-11 rounded-md">
            <Link href="/checkout">Checkout</Link>
          </Button>
        </CardFooter>
        <div className="border-t border-border/60 px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
          <DisclosureAccordion
            items={[
              {
                id: "shipping",
                label: policyCopy.shipping.label,
                defaultOpen: true,
                content: <p>{policyCopy.shipping.body}</p>,
              },
              {
                id: "returns",
                label: policyCopy.returns.label,
                defaultOpen: true,
                content: <p>{policyCopy.returns.body}</p>,
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
