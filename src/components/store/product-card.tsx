import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CatalogPrice } from "@/components/store/price";
import { CompositionCanvas } from "@/components/store/composition-canvas";
import { OVERLAY_PILL_CLASS, SAVE_BADGE_CLASS } from "@/components/store/overlay-pill";
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
export function ProductCard({
  card,
  headingLevel = 2,
}: {
  card: CatalogCardModel;
  /** 3 when the card sits under a section's own h2 (the homepage rails). */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const concentration = concentrationLabel(card.concentration);
  const genderLabel = card.gender ? capitalizeFirst(card.gender) : null;
  const subtitle =
    [concentration, genderLabel].filter(Boolean).join(" · ") || labelForType(card.type);
  // `relative` on the article contains the card's absolutely positioned bits
  // (sr-only text included), so inside a scrolling rail they're clipped by
  // the rail instead of pushing the whole page wider.
  return (
    <article className="group relative flex h-full select-none flex-col overflow-hidden rounded-md border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_20px_44px_-28px_rgba(31,28,24,0.4)]">
      <Link
        href={card.href}
        className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-ink"
      >
        <div className="relative overflow-hidden">
          {/* Sized for a narrow card: phones show two columns (~160px
              cards), and every wider tier stays under ~350px. The pills keep
              one compact size throughout; only the body text and padding
              grow a step from min-[576px], where cards get roomier. */}
          {card.ratingValue ? (
            <span className={`absolute left-2 top-2 h-6 gap-1 px-2 text-[11px] ${OVERLAY_PILL_CLASS}`}>
              <Star className="h-3 w-3 fill-gold text-gold" aria-hidden="true" />
              <span className="sr-only">Rated </span>
              {card.ratingValue.toFixed(1)}
              <span className="sr-only"> out of 5</span>
            </span>
          ) : null}
          {card.savePercent && card.savePercent > 0 ? (
            <span className={`absolute right-2 top-2 z-10 h-6 border border-gold-foreground/25 px-2 text-[11px] shadow-sm ${SAVE_BADGE_CLASS}`}>
              Save {card.savePercent}%
            </span>
          ) : null}
          <span className={`absolute left-2 bottom-2 h-5 max-w-[calc(100%-1rem)] truncate px-1.5 text-[11px] min-[576px]:h-6 min-[576px]:px-2.5 min-[576px]:text-[13px] ${OVERLAY_PILL_CLASS}`}>
            {labelForCategory(card.fragranceCategory)}
          </span>
          <CompositionCanvas
            brand={card.brand}
            name={card.name}
            pyramid={card.notePyramid}
            imageUrl={card.imageUrl}
            imageAlt={card.imageAlt}
            className="p-3 min-[576px]:p-4"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3 min-[576px]:gap-1.5 min-[576px]:p-4">
          <p className="text-[11px] sm:text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{card.brand}</p>
          <Heading className="font-serif-display line-clamp-2 text-base leading-snug font-semibold min-[576px]:text-lg">
            {card.name}
          </Heading>
          <p className="line-clamp-2 text-xs text-muted-foreground min-[576px]:line-clamp-1">{subtitle}</p>
          <div className="mt-auto space-y-2 pt-2 min-[576px]:space-y-3 min-[576px]:pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={card.fulfillment === "PRE_ORDER" ? "outline" : "secondary"}
                className="h-5 border-foreground/25 px-1.5 text-[11px] min-[576px]:h-6 min-[576px]:px-2.5 min-[576px]:text-[13px]"
              >
                {card.fulfillment === "PRE_ORDER" ? "Pre-order" : "On hand"}
              </Badge>
              {card.hasRetailDecant ? (
                <Badge variant="outline" className="h-5 border-foreground/25 px-1.5 text-[11px] min-[576px]:h-6 min-[576px]:px-2.5 min-[576px]:text-[13px]">
                  Retail
                </Badge>
              ) : null}
              {card.soldOut ? (
                <Badge variant="destructive" className="h-5 border-destructive/30 px-1.5 text-[11px] min-[576px]:h-6 min-[576px]:px-2.5 min-[576px]:text-[13px]">
                  Sold out
                </Badge>
              ) : null}
            </div>
            <div className="border-t border-border/60 pt-2 min-[576px]:pt-3">
              <CatalogPrice
                minOriginalCentavos={card.minOriginalCentavos}
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
      <div className="px-3 pb-3 min-[576px]:px-4 min-[576px]:pb-4">
        <Button asChild variant="gold" size="lg" className="h-11 w-full rounded-md">
          <Link href={card.href}>View</Link>
        </Button>
      </div>
    </article>
  );
}
