import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CatalogPrice } from "@/components/store/price";
import { CompositionCanvas } from "@/components/store/composition-canvas";
import { concentrationLabel } from "@/domain/concentration";
import { labelForCategory, labelForType } from "@/domain/product-type";
import { capitalizeFirst } from "@/lib/utils";
import type { CatalogCardModel } from "@/lib/catalog";

/**
 * No client-side state left (no size picker, no add-to-cart/buy-now — a
 * shop-grid card is browse-only, "View" is the only action, and the PDP is
 * where a size actually gets picked and bought) — so this renders fully on
 * the server. Only `CompositionCanvas` below is a client component, and a
 * Server Component can render one of those directly.
 */
export function ProductCard({ card }: { card: CatalogCardModel }) {
  const concentration = concentrationLabel(card.concentration);
  const genderLabel = card.gender ? capitalizeFirst(card.gender) : null;
  const subtitle =
    [concentration, genderLabel].filter(Boolean).join(" · ") || labelForType(card.type);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_20px_44px_-28px_rgba(31,28,24,0.4)]">
      <Link href={card.href} className="flex flex-1 flex-col">
        <div className="relative overflow-hidden">
          {/* Sized for a full-width mobile card (1-column grid) by default,
              then scaled back down from min-[576px] up — the shop grid packs
              in more, narrower columns from there (2/3/4 cols), and the
              bigger mobile size would otherwise overwhelm a narrower card's
              image at every wider step. The border stays the same at both
              sizes; only type size/padding shrink. */}
          {card.ratingValue ? (
            <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-none border border-foreground/25 bg-background/90 px-2.5 py-1 text-[13px] font-medium text-foreground shadow-sm backdrop-blur-sm min-[576px]:gap-1 min-[576px]:px-2 min-[576px]:py-0.5 min-[576px]:text-[11px]">
              <Star className="h-3.5 w-3.5 fill-gold text-gold min-[576px]:h-3 min-[576px]:w-3" aria-hidden="true" />
              {card.ratingValue.toFixed(1)}
            </span>
          ) : null}
          {card.savePercent && card.savePercent > 0 ? (
            <span className="absolute right-2 top-2 z-10 rounded-none border border-charcoal/25 bg-gold px-2.5 py-1 text-[13px] font-medium text-charcoal shadow-sm min-[576px]:px-2 min-[576px]:py-0.5 min-[576px]:text-[11px]">
              Save {card.savePercent}%
            </span>
          ) : null}
          <span className="absolute left-2 bottom-2 z-10 inline-flex items-center rounded-none border border-foreground/25 bg-background/90 px-2.5 py-1 text-[13px] font-medium uppercase tracking-[0.2em] text-foreground shadow-sm backdrop-blur-sm min-[576px]:px-2 min-[576px]:py-0.5 min-[576px]:text-[10px]">
            {labelForCategory(card.fragranceCategory)}
          </span>
          <CompositionCanvas
            brand={card.brand}
            name={card.name}
            pyramid={card.notePyramid}
            imageUrl={card.imageUrl}
            imageAlt={card.imageAlt}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{card.brand}</p>
          <h2 className="font-serif-display line-clamp-2 text-lg leading-snug font-semibold">
            {card.name}
          </h2>
          <p className="line-clamp-1 text-xs text-muted-foreground">{subtitle}</p>
          <div className="mt-auto space-y-3 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={card.fulfillment === "PRE_ORDER" ? "outline" : "secondary"}
                className="h-6 border-foreground/25 px-2.5 text-[13px]"
              >
                {card.fulfillment === "PRE_ORDER" ? "Pre-order" : "On hand"}
              </Badge>
              {card.hasRetailDecant ? (
                <Badge variant="outline" className="h-6 border-foreground/25 px-2.5 text-[13px]">
                  Retail
                </Badge>
              ) : null}
              {card.soldOut ? (
                <Badge variant="destructive" className="h-6 border-destructive/30 px-2.5 text-[13px]">
                  Sold out
                </Badge>
              ) : null}
            </div>
            <div className="border-t border-border/60 pt-3">
              <CatalogPrice
                minOriginalCentavos={card.minOriginalCentavos}
                maxOriginalCentavos={card.maxOriginalCentavos}
                minDiscountedCentavos={card.minDiscountedCentavos}
                maxDiscountedCentavos={card.maxDiscountedCentavos}
                savePercent={card.savePercent}
                align="right"
                showSaveBadge={false}
              />
            </div>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <Button asChild variant="gold" size="lg" className="h-11 w-full rounded-md">
          <Link href={card.href}>View</Link>
        </Button>
      </div>
    </article>
  );
}
