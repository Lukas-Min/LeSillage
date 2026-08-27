import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CatalogPrice } from "@/components/store/price";
import { ProductImage } from "@/components/store/product-image";
import type { CatalogCardModel } from "@/lib/catalog";

export function ProductCard({ card }: { card: CatalogCardModel }) {
  return (
    <Link
      href={card.href}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-gold/40"
    >
      <ProductImage
        src={card.imageUrl}
        alt={card.imageAlt ?? card.name}
        fallback={card.brand}
        className="aspect-square w-full border-b border-gold/15"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[10px] uppercase tracking-[0.32em] text-gold-foreground">{card.brand}</p>
        <h2 className="font-serif-display line-clamp-2 text-lg leading-snug">{card.name}</h2>
        <p className="line-clamp-1 text-xs text-muted-foreground">{card.family ?? labelForType(card.type)}</p>
        <div className="mt-auto space-y-2 pt-3">
          <div className="flex flex-wrap gap-1">
            <Badge variant={card.fulfillment === "PRE_ORDER" ? "outline" : "secondary"}>
              {card.fulfillment === "PRE_ORDER" ? "Pre-order" : "On hand"}
            </Badge>
            {card.soldOut ? <Badge variant="destructive">Sold out</Badge> : null}
            {card.conditionLabel ? <Badge variant="outline">{card.conditionLabel}</Badge> : null}
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
