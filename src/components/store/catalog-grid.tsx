import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";
import { ProductCard } from "@/components/store/product-card";
import type { CatalogCardModel } from "@/lib/catalog";

export function CatalogResults({
  cards,
  emptyLabel = "No items match this filter yet.",
  showCount = true,
}: {
  cards: CatalogCardModel[];
  emptyLabel?: string;
  showCount?: boolean;
}) {
  const countLabel = `${cards.length} fragrance${cards.length === 1 ? "" : "s"}`;
  return (
    <div className="flex flex-1 flex-col">
      {showCount ? (
        <p className="mb-6 text-center text-[11px] sm:text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          {countLabel}
        </p>
      ) : null}
      {cards.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border/80 p-10 text-center">
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          <Link href="/shop" className="mt-3 inline-block text-sm underline-offset-4 hover:underline">
            Browse the shop
          </Link>
        </div>
      ) : (
        // One column only on very small screens (under 360px, e.g. 320px
        // phones or heavy zoom); two on every common phone, three from sm
        // (640px, so tablets and narrow windows don't get two oversized cards),
        // scaling up to 5 columns, the max, on wide desktop (xl). ProductCard and CatalogPrice size themselves for the
        // narrow phone cards and step up in the roomier 576-767px tier.
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 min-[576px]:gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
          {cards.map((card) => (
            <ProductCard key={card.productId} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The catalog pages' header (/shop, /collections/*, and the type shelves):
 * left-aligned and compact, matching the homepage section headers, so the
 * products start higher on a phone. `subtitle` accepts a node so a loading
 * state can pass skeleton lines in its place.
 */
export function CatalogHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-1.5 sm:mb-8 sm:gap-2">
      {eyebrow}
      {typeof title === "string" ? (
        <h1 className="font-serif-display text-3xl leading-tight sm:text-5xl">{title}</h1>
      ) : (
        title
      )}
      {typeof subtitle === "string" ? (
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>
      ) : (
        subtitle
      )}
    </header>
  );
}

export function CatalogGrid({
  title,
  subtitle,
  cards,
  emptyLabel,
  filters,
  eyebrow,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  cards: CatalogCardModel[];
  emptyLabel?: string;
  filters?: ReactNode;
  eyebrow?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}) {
  return (
    <main className="flex w-full flex-1 flex-col px-4 py-10 sm:py-14">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} className="mb-6" /> : null}
      <CatalogHeader eyebrow={eyebrow ?? <Eyebrow>Le Sillage Manila</Eyebrow>} title={title} subtitle={subtitle} />
      {filters ? <div className="mb-4 flex justify-center">{filters}</div> : null}
      <CatalogResults cards={cards} emptyLabel={emptyLabel} />
    </main>
  );
}
