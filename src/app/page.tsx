import Link from "next/link";
import { Suspense } from "react";
import { Star } from "lucide-react";
import { loadCatalogCards, type CatalogCardModel } from "@/lib/catalog";
import { Price } from "@/components/store/price";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";
import { CompositionCanvas } from "@/components/store/composition-canvas";
import {
  DealsRail,
  DecantsRail,
  HomeSectionHeader,
  HowItWorksSteps,
  NewArrivalsRail,
  RailSkeleton,
  ScentFamilies,
  ShelfTiles,
} from "@/components/store/home-sections";
import { OVERLAY_PILL_CLASS, SAVE_BADGE_CLASS } from "@/components/store/overlay-pill";
import { SubscribeHero } from "@/components/store/subscribe-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { concentrationLabel } from "@/domain/concentration";
import { labelForCategory } from "@/domain/product-type";
import { capitalizeFirst } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="surface-grid border-b border-border/60">
        <div className="flex w-full flex-col gap-10 px-4 pb-8 pt-8 sm:py-24">
          <div className="flex flex-col items-center gap-3 text-center">
            <Eyebrow>Est. 2026 · Manila</Eyebrow>
            <h1 className="font-serif-display text-4xl leading-tight sm:text-6xl">Le Sillage Manila</h1>
          </div>
          <Suspense fallback={<FlagshipSkeleton />}>
            <FlagshipPanel />
          </Suspense>
          <p className="mx-auto -mt-4 max-w-xl text-center font-serif-display text-lg italic text-muted-foreground sm:mt-0">
            &ldquo;A curated trail of scent, in bottles and decants.&rdquo;
          </p>
        </div>
      </section>

      <section aria-labelledby="home-deals" className="flex w-full flex-col gap-5 pt-10 sm:pt-14">
        <HomeSectionHeader
          id="home-deals"
          eyebrow="Deals"
          title="On sale now"
          subtitle="Current markdowns, biggest savings first."
          href="/shop?sort=discount_desc"
          linkLabel="deals"
        />
        <Suspense fallback={<RailSkeleton showSave />}>
          <DealsRail />
        </Suspense>
      </section>

      <section aria-labelledby="home-shelves" className="flex w-full flex-col gap-5 pt-10 sm:pt-14">
        <HomeSectionHeader id="home-shelves" eyebrow="The shelf" title="Browse by type" />
        <ShelfTiles />
      </section>

      <section aria-labelledby="home-new" className="flex w-full flex-col gap-5 pt-10 sm:pt-14">
        <HomeSectionHeader
          id="home-new"
          eyebrow="Just in"
          title="New arrivals"
          subtitle="The latest additions to the shelf."
          href="/shop?sort=newest"
          linkLabel="new arrivals"
        />
        <Suspense fallback={<RailSkeleton />}>
          <NewArrivalsRail />
        </Suspense>
      </section>

      <section aria-labelledby="home-decants" className="flex w-full flex-col gap-5 pt-10 sm:pt-14">
        <HomeSectionHeader
          id="home-decants"
          eyebrow="Decants"
          title="Try before the bottle"
          subtitle="Our highest-rated decants, from 3 ml."
          href="/shop?type=DECANT"
          linkLabel="decants"
        />
        <Suspense fallback={<RailSkeleton />}>
          <DecantsRail />
        </Suspense>
      </section>

      <section aria-labelledby="home-families" className="flex w-full flex-col gap-5 pt-10 sm:pt-14">
        <HomeSectionHeader id="home-families" eyebrow="Collections" title="Shop by scent family" />
        <ScentFamilies />
      </section>

      <section aria-labelledby="home-how" className="flex w-full flex-col gap-5 pt-10 sm:pt-14">
        <HomeSectionHeader id="home-how" eyebrow="How it works" title="From browsing to bottle, in three steps" />
        <HowItWorksSteps />
      </section>

      <div className="w-full px-4 pb-16 pt-10 sm:pt-14">
        <SubscribeHero compact />
      </div>
    </main>
  );
}

async function FlagshipPanel() {
  const cards = await loadCatalogCards({ type: "FULL_BOTTLE" });
  const flagship = pickFlagship(cards);
  if (!flagship) return null;
  const concentration = concentrationLabel(flagship.concentration);
  const gender = flagship.gender ? capitalizeFirst(flagship.gender) : null;
  const specs = [concentration, gender].filter(Boolean).join(" · ");
  // Mobile splits the specs across the right-hand side: concentration beside
  // the name, gender beside the perfumer line (or both beside the name when
  // there's no perfumer line to pair with).
  const nameRowSpec = flagship.description ? concentration : specs || null;
  const descriptionRowSpec = flagship.description ? gender : null;
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 items-center gap-8 sm:grid-cols-[1fr_1.2fr]">
      <div className="relative mx-auto w-full max-w-xs">
        {flagship.ratingValue ? (
          <span className={`absolute left-2 top-2 gap-1 ${OVERLAY_PILL_CLASS}`}>
            <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden="true" />
            <span className="sr-only">Rated </span>
            {flagship.ratingValue.toFixed(1)}
            <span className="sr-only"> out of 5</span>
          </span>
        ) : null}
        {flagship.savePercent && flagship.savePercent > 0 ? (
          <span className={`absolute right-2 top-2 z-10 border border-gold-foreground/25 shadow-sm ${SAVE_BADGE_CLASS}`}>
            Save {flagship.savePercent}%
          </span>
        ) : null}
        <span className={`absolute left-2 bottom-2 ${OVERLAY_PILL_CLASS} uppercase tracking-[0.2em]`}>
          {labelForCategory(flagship.fragranceCategory)}
        </span>
        <CompositionCanvas
          brand={flagship.brand}
          name={flagship.name}
          pyramid={flagship.notePyramid}
          imageUrl={flagship.imageUrl}
          imageAlt={flagship.imageAlt}
          enableLightbox
          priority
        />
      </div>
      <div className="mx-auto flex w-full max-w-xs flex-col gap-2 sm:max-w-none">
        {/* pl-[0.4em] offsets the tracking's trailing gap so the centered
            brand is optically centered. */}
        <p className="pl-[0.4em] text-center text-xs uppercase tracking-[0.4em] text-muted-foreground">
          {flagship.brand}
        </p>
        {/* Mobile: name and perfumer line on the left, their specs on the
            right. sm+: everything centred in the column beside the photo,
            with one "Eau de Parfum · Men" line under the name. */}
        <div className="flex items-baseline-last justify-between gap-4 sm:justify-center">
          <h2 className="min-w-0 font-serif-display text-3xl leading-tight sm:text-4xl">{flagship.name}</h2>
          {nameRowSpec ? (
            <p className="shrink-0 text-right text-sm text-muted-foreground sm:hidden">{nameRowSpec}</p>
          ) : null}
        </div>
        {specs ? <p className="hidden text-center text-sm text-muted-foreground sm:block">{specs}</p> : null}
        {flagship.description ? (
          <div className="flex items-baseline justify-between gap-4 sm:justify-center">
            <p className="min-w-0 text-sm text-muted-foreground sm:text-center sm:text-base">{flagship.description}</p>
            {descriptionRowSpec ? (
              <p className="shrink-0 text-right text-sm text-muted-foreground sm:hidden">{descriptionRowSpec}</p>
            ) : null}
          </div>
        ) : null}
        <Price
          className="self-center pt-1"
          originalCentavos={flagship.minOriginalCentavos}
          discountedCentavos={flagship.minDiscountedCentavos}
          showSaveBadge={false}
        />
        <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row sm:self-center">
          <Button asChild variant="gold" size="lg" className="h-11 w-full rounded-md sm:w-44">
            <Link href={flagship.href}>View</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11 w-full rounded-md sm:w-44">
            <Link href="/shop">Shop the catalog</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function pickFlagship(cards: CatalogCardModel[]): CatalogCardModel | null {
  const inStock = cards.filter((c) => !c.soldOut);
  if (inStock.length === 0) return null;
  // Discounted full bottles get priority — random among those; only fall
  // back to the whole in-stock pool when none currently have a discount.
  const discounted = inStock.filter((c) => c.hasDiscount);
  const pool = discounted.length > 0 ? discounted : inStock;
  return pool[Math.floor(Math.random() * pool.length)];
}

function FlagshipSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 items-center gap-8 sm:grid-cols-[1fr_1.2fr]">
      <Skeleton className="mx-auto aspect-square w-full max-w-xs rounded-md" />
      <div className="mx-auto flex w-full max-w-xs flex-col gap-2 sm:max-w-none">
        <Skeleton className="mx-auto h-4 w-24" />
        <div className="flex items-end justify-between gap-4 sm:justify-center">
          <Skeleton className="h-9 w-40 sm:h-11 sm:w-72" />
          <Skeleton className="mb-2 h-4 w-24 shrink-0 sm:hidden" />
        </div>
        <Skeleton className="mx-auto hidden h-5 w-40 sm:block" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex w-full flex-col gap-1 sm:items-center">
            <Skeleton className="h-4 w-full sm:h-5" />
            <Skeleton className="h-4 w-2/3 sm:h-5" />
          </div>
          <Skeleton className="h-4 w-12 shrink-0 sm:hidden" />
        </div>
        <Skeleton className="mt-1 h-8 w-48 self-center" />
        <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row sm:self-center">
          <Skeleton className="h-11 w-full rounded-md sm:w-44" />
          <Button asChild variant="outline" size="lg" className="h-11 w-full rounded-md sm:w-44">
            <Link href="/shop">Shop the catalog</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
