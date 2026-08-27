import Link from "next/link";
import type { ReactNode } from "react";
import { ProductCard } from "@/components/store/product-card";
import type { CatalogCardModel } from "@/lib/catalog";

export function CatalogGrid({
  title,
  subtitle,
  cards,
  emptyLabel = "No items match this filter yet.",
  filters,
}: {
  title: string;
  subtitle?: string;
  cards: CatalogCardModel[];
  emptyLabel?: string;
  filters?: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="font-serif-display text-2xl sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </header>
      {filters}
      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          <Link href="/bottles" className="mt-3 inline-block text-sm underline-offset-4 hover:underline">
            Browse the full catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
          {cards.map((card) => (
            <ProductCard key={card.productId} card={card} />
          ))}
        </div>
      )}
    </main>
  );
}
