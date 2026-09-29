import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DisclosureAccordion } from "@/components/ui/disclosure-accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { policyCopy } from "@/lib/policy-copy";

// loading.tsx can't read [skuId], so the product type isn't known here —
// the buy box mirrors DecantBuyBox (the default shelf: fulfillment badge,
// Size, price, stepper, Add to cart/Buy now). A full bottle's extra
// Condition row fills in once the page resolves.
export default function ProductLoading() {
  return (
    <main className="w-full px-4 pt-4 pb-8 sm:pt-6 sm:pb-12 2xl:mx-auto 2xl:max-w-[80vw]">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }]} />
      <div className="flex flex-col gap-8 md:grid md:grid-cols-2 md:gap-12 md:divide-x md:divide-border/60">
        <div className="contents md:flex md:flex-col md:gap-6 md:pr-12">
          <div className="relative order-1">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="absolute left-2 top-2 z-10">
              <Skeleton className="h-[30px] w-20 rounded-none border border-foreground/25 bg-background/90" />
            </div>
          </div>
          <div className="order-3 space-y-2">
            <p className="text-[11px] sm:text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Main accords</p>
            <div className="space-y-3">
              <Skeleton className="h-1.5 w-full rounded-none" />
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            </div>
          </div>
          <div className="order-4">
            <div className="space-y-4 border-t border-border/60 pt-4">
              <p className="text-[11px] sm:text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Notes</p>
              <div className="space-y-3">
                <div className="hidden border-b border-border/40 pb-2 text-[11px] sm:text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:grid sm:grid-cols-3 sm:gap-2">
                  <span className="text-center">Top</span>
                  <span className="text-center">Heart</span>
                  <span className="text-center">Base</span>
                </div>
                <div className="grid grid-cols-1 gap-4 text-sm leading-relaxed sm:grid-cols-3 sm:gap-2 sm:gap-y-0">
                  {["Top", "Heart", "Base"].map((label) => (
                    <div key={label} className="space-y-2 sm:space-y-1">
                      <p className="text-center text-[11px] sm:text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:hidden">
                        {label}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:flex-col sm:flex-nowrap sm:gap-1">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="contents md:flex md:flex-col md:gap-6 md:sticky md:top-20 md:self-stretch md:pl-12">
          <div className="order-2 flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-56 sm:h-12.5 sm:w-72" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-11 w-11 shrink-0" />
          </div>

          <div className="order-6 flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8.5 w-44 rounded-none" />
            </div>
            <div className="space-y-3">
              <p className="text-[11px] sm:text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Size</p>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-11 w-16 rounded-none" />
                <Skeleton className="h-11 w-16 rounded-none" />
                <Skeleton className="h-11 w-18 rounded-none" />
                <Skeleton className="h-11 w-18 rounded-none" />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-32" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-11 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-11 flex-1" />
                  <Skeleton className="h-11 flex-1" />
                </div>
              </div>
            </div>
          </div>

          <section className="order-7 border-t border-border/60 pt-2">
            <DisclosureAccordion
              items={[
                {
                  id: "shipping",
                  label: policyCopy.shipping.label,
                  content: <p>{policyCopy.shipping.body}</p>,
                  defaultOpen: true,
                },
                {
                  id: "returns",
                  label: policyCopy.returns.label,
                  content: <p>{policyCopy.returns.body}</p>,
                  defaultOpen: true,
                },
              ]}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
