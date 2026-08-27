"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CatalogPrice } from "@/components/store/price";
import { CompositionCanvas } from "@/components/store/composition-canvas";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { concentrationLabel } from "@/domain/concentration";
import type { CatalogCardModel } from "@/lib/catalog";

export function ProductCard({ card }: { card: CatalogCardModel }) {
  const concentration = concentrationLabel(card.concentration);
  const subtitle = [card.family, concentration].filter(Boolean).join(" · ") || labelForType(card.type);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_20px_44px_-28px_rgba(31,28,24,0.4)]">
      <Link href={card.href} className="flex flex-1 flex-col">
        <div className="overflow-hidden">
          <CompositionCanvas brand={card.brand} name={card.name} pyramid={card.notePyramid} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{card.brand}</p>
          <h2 className="font-serif-display line-clamp-2 text-lg leading-snug transition-colors group-hover:text-gold-foreground">
            {card.name}
          </h2>
          <p className="line-clamp-1 text-xs text-muted-foreground">{subtitle}</p>
          <div className="mt-auto space-y-3 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={card.fulfillment === "PRE_ORDER" ? "outline" : "secondary"}>
                {card.fulfillment === "PRE_ORDER" ? "Pre-order" : "On hand"}
              </Badge>
              <Badge variant="outline">{card.conditionLabel}</Badge>
              {card.soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
            </div>
            <div className="border-t border-border/60 pt-3">
              <CatalogPrice
                minOriginalCentavos={card.minOriginalCentavos}
                maxOriginalCentavos={card.maxOriginalCentavos}
                minDiscountedCentavos={card.minDiscountedCentavos}
                maxDiscountedCentavos={card.maxDiscountedCentavos}
                savePercent={card.savePercent}
              />
            </div>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <AddToCartButton skuId={card.skuId} variant="compact" soldOut={card.soldOut} />
      </div>
    </article>
  );
}

function labelForType(type: CatalogCardModel["type"]): string {
  switch (type) {
    case "DECANT":
      return "Decant";
    case "FULL_BOTTLE":
      return "Full bottle";
    case "PARTIAL":
      return "Partial";
    default: {
      const exhaustive: never = type;
      return String(exhaustive);
    }
  }
}
