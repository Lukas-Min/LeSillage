"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CatalogPrice } from "@/components/store/price";
import { CompositionCanvas } from "@/components/store/composition-canvas";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import type { CatalogCardModel } from "@/lib/catalog";

export function ProductCard({ card }: { card: CatalogCardModel }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-card">
      <Link href={card.href} className="flex flex-1 flex-col">
        <CompositionCanvas brand={card.brand} name={card.name} pyramid={card.notePyramid} />
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{card.brand}</p>
          <h2 className="font-serif-display line-clamp-2 text-lg leading-snug">{card.name}</h2>
          <p className="line-clamp-1 text-xs text-muted-foreground">{card.family ?? labelForType(card.type)}</p>
          <div className="mt-auto space-y-2 pt-3">
            <div className="flex flex-wrap gap-1">
              <Badge variant={card.fulfillment === "PRE_ORDER" ? "outline" : "secondary"}>
                {card.fulfillment === "PRE_ORDER" ? "Pre-order" : "On hand"}
              </Badge>
              {card.soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
              <Badge variant="outline">{card.conditionLabel}</Badge>
            </div>
            <CatalogPrice
              minOriginalCentavos={card.minOriginalCentavos}
              maxOriginalCentavos={card.maxOriginalCentavos}
              minDiscountedCentavos={card.minDiscountedCentavos}
              maxDiscountedCentavos={card.maxDiscountedCentavos}
              savePercent={card.savePercent}
            />
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
