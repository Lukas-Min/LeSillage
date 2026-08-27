import Link from "next/link";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/section";
import { ProductCard } from "@/components/store/product-card";
import type { CatalogCardModel } from "@/lib/catalog";

export function CatalogResults({
  cards,
  emptyLabel = "No items match this filter yet.",
}: {
  cards: CatalogCardModel[];
  emptyLabel?: string;
}) {
  const countLabel = `${cards.length} fragrance${cards.length === 1 ? "" : "s"}`;
  return (
    <>
      <p className="mb-6 text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        {countLabel}
      </p>
      {cards.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/80 p-10 text-center">
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          <Link href="/shop" className="mt-3 inline-block text-sm underline-offset-4 hover:underline">
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
          {cards.map((card) => (
            <ProductCard key={card.productId} card={card} />
          ))}
        </div>
      )}
    </>
  );
}

export function CatalogGrid({
  title,
  subtitle,
  cards,
  emptyLabel,
  filters,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  cards: CatalogCardModel[];
  emptyLabel?: string;
  filters?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <header className="mb-8 flex flex-col items-center gap-3 text-center">
        {eyebrow ? eyebrow : <Eyebrow>Le Sillage · Manila</Eyebrow>}
        <h1 className="font-serif-display text-4xl leading-tight sm:text-5xl">{title}</h1>
        {subtitle ? (
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>
        ) : null}
      </header>
      {filters ? <div className="mb-4 flex justify-center">{filters}</div> : null}
      <CatalogResults cards={cards} emptyLabel={emptyLabel} />
    </main>
  );
}
