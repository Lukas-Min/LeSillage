import Link from "next/link";
import { ArrowRight, BadgePercent, Droplet, Gift, PackageOpen, SprayCan, Store, Truck, type LucideIcon } from "lucide-react";
import type { FragranceCategory } from "@/db/schema";
import { ProductCard } from "@/components/store/product-card";
import { CatalogCardSkeleton } from "@/components/store/loading";
import { Eyebrow } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { DECANT_SIZES_ML } from "@/domain/decant";
import { formatPHP } from "@/domain/money";
import { siteWideDiscountStatus } from "@/domain/promo";
import type { CatalogCardModel } from "@/lib/catalog";
import { loadPromoConfig } from "@/lib/cart";
import { FRAGRANCE_CATEGORY_BLURBS } from "@/lib/faq-copy";
import { loadHomeRails } from "@/lib/home-rails";
import { formatDate } from "@/lib/utils";

/** Shared focus ring for the homepage's own links (WCAG 2.4.7) — the global
 *  fallback is a 1px half-opacity outline that disappears against a border. */
export const HOME_FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink";

/** Left-aligned section header, with an optional "See all" link on the right. */
export function HomeSectionHeader({
  id,
  eyebrow,
  title,
  subtitle,
  href,
  linkLabel,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  href?: string;
  /** Read after "See all" by screen readers, e.g. "deals". */
  linkLabel?: string;
}) {
  return (
    <header className="flex items-end justify-between gap-4 px-4">
      <div className="min-w-0 space-y-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={id} className="font-serif-display text-2xl leading-tight sm:text-3xl">
          {title}
        </h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1 text-xs uppercase tracking-[0.2em] text-gold-ink hover:underline hover:underline-offset-4 ${HOME_FOCUS_RING}`}
        >
          See all
          {linkLabel ? <span className="sr-only"> {linkLabel}</span> : null}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Product rails
// ---------------------------------------------------------------------------

/** One card per slot: most of a phone's width (the next card peeks in to
 *  show the row scrolls), then more, narrower slots as the screen widens. */
const RAIL_ITEM_CLASS =
  "w-[72%] max-w-[18rem] shrink-0 snap-start min-[576px]:w-[45%] md:w-[31%] lg:w-[23.5%] xl:w-[18.8%]";
const RAIL_LIST_CLASS =
  "flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pb-3 [scrollbar-width:thin]";

function RailCards({ cards, emptyMessage }: { cards: CatalogCardModel[]; emptyMessage: string }) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-1 flex-col px-4">
        <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border/80 p-10 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }
  return (
    <ul className={RAIL_LIST_CLASS}>
      {cards.map((card) => (
        <li key={card.productId} className={RAIL_ITEM_CLASS}>
          <ProductCard card={card} headingLevel={3} />
        </li>
      ))}
    </ul>
  );
}

export function RailSkeleton() {
  return (
    <div className={`${RAIL_LIST_CLASS} overflow-hidden`} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className={RAIL_ITEM_CLASS}>
          <CatalogCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export async function DealsRail() {
  const { deals } = await loadHomeRails();
  return <RailCards cards={deals} emptyMessage="No markdowns right now. Check back soon." />;
}

export async function NewArrivalsRail() {
  const { newArrivals } = await loadHomeRails();
  return <RailCards cards={newArrivals} emptyMessage="Nothing new on the shelf yet." />;
}

export async function DecantsRail() {
  const { decants } = await loadHomeRails();
  return <RailCards cards={decants} emptyMessage="No decants on the shelf yet." />;
}

// ---------------------------------------------------------------------------
// Perks strip
// ---------------------------------------------------------------------------

interface Perk {
  icon: LucideIcon;
  title: string;
  detail: string;
}

/** "₱2,000.00" → "₱2,000" — whole-peso amounts read cleaner in a headline. */
function formatPesos(centavos: number): string {
  return formatPHP(centavos).replace(/\.00$/, "");
}

const PERKS_LIST_CLASS =
  "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none";
/** An odd last perk spans both phone columns instead of leaving a hole. */
const PERK_ITEM_CLASS =
  "flex items-start gap-3 bg-card p-3 sm:p-4 [&:last-child:nth-child(odd)]:col-span-2 sm:[&:last-child:nth-child(odd)]:col-span-1";

/** The store's live perks, from the admin's promo settings. */
export async function PerksStrip() {
  const config = await loadPromoConfig();
  const threshold = formatPesos(config.decantThresholdCentavos);
  const sale = config.siteWideDiscount;
  const perks: Perk[] = [];
  if (siteWideDiscountStatus(sale) === "ACTIVE") {
    perks.push({
      icon: BadgePercent,
      title: sale.type === "PERCENTAGE" ? `${sale.amount}% off everything` : `${formatPesos(sale.amount)} off every item`,
      detail: sale.endsAt ? `Until ${formatDate(sale.endsAt)}` : "Site-wide sale",
    });
  }
  if (config.freeDeliveryEnabled) {
    perks.push({ icon: Truck, title: "Free delivery", detail: `On ${threshold} of decants` });
  }
  if (config.testerBonusEnabled) {
    perks.push({ icon: Gift, title: "A free tester", detail: `With ${threshold} of decants` });
  }
  perks.push({
    icon: Droplet,
    title: `Try from ${DECANT_SIZES_ML[0]} ml`,
    detail: `Decants in ${DECANT_SIZES_ML.slice(0, -1).join(", ")} and ${DECANT_SIZES_ML.at(-1)} ml`,
  });
  perks.push({ icon: Store, title: "Free pickup", detail: `Or ${formatPesos(config.deliveryFeeCentavos)} flat delivery` });

  return (
    <ul className={PERKS_LIST_CLASS}>
      {perks.map(({ icon: Icon, title, detail }) => (
        <li key={title} className={PERK_ITEM_CLASS}>
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-ink" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Four perks is the usual count (delivery, tester, sizes, pickup). */
export function PerksSkeleton() {
  return (
    <div className={PERKS_LIST_CLASS} aria-hidden="true">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className={PERK_ITEM_CLASS}>
          <Skeleton className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static sections
// ---------------------------------------------------------------------------

const SHELVES = [
  { title: "Decants", subtitle: "Try before the full bottle", href: "/shop?type=DECANT", icon: Droplet },
  { title: "Full bottles", subtitle: "Sealed, ready to ship", href: "/shop?type=FULL_BOTTLE", icon: SprayCan },
  { title: "Partials", subtitle: "Opened once, priced to move", href: "/shop?type=PARTIAL", icon: PackageOpen },
] as const;

/** Three compact tiles in one row, even on a phone. */
export function ShelfTiles() {
  return (
    <ul className="grid grid-cols-3 gap-3 px-4 sm:gap-4">
      {SHELVES.map(({ title, subtitle, href, icon: Icon }) => (
        <li key={title}>
          <Link
            href={href}
            className={`group flex h-full flex-col items-center gap-2 rounded-md border border-border bg-card px-2 py-4 text-center transition-colors hover:border-gold/60 sm:gap-3 sm:p-6 ${HOME_FOCUS_RING}`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold-ink transition-colors group-hover:border-gold sm:h-14 sm:w-14">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </span>
            <h3 className="font-serif-display text-base leading-tight sm:text-2xl">{title}</h3>
            <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:block">{subtitle}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const FAMILIES: Array<{ slug: string; category: FragranceCategory; title: string }> = [
  { slug: "middle-eastern", category: "MIDDLE_EASTERN", title: "Middle Eastern" },
  { slug: "designer", category: "DESIGNER", title: "Designer" },
  { slug: "niche", category: "NICHE", title: "Niche" },
];

/** The /collections pages, with the same blurbs the FAQ and collection pages use. */
export function ScentFamilies() {
  return (
    <ul className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-3 sm:gap-4">
      {FAMILIES.map(({ slug, category, title }) => {
        const blurb = FRAGRANCE_CATEGORY_BLURBS[category];
        return (
          <li key={slug}>
            <Link
              href={`/collections/${slug}`}
              className={`group flex h-full items-start justify-between gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:border-gold/60 sm:p-6 ${HOME_FOCUS_RING}`}
            >
              <div className="min-w-0 space-y-1">
                <h3 className="font-serif-display text-xl leading-tight">{title}</h3>
                {/* Stored lower-case-initial for the FAQ's "Niche — …" lead-in. */}
                <p className="text-sm text-muted-foreground">{blurb.charAt(0).toUpperCase() + blurb.slice(1)}</p>
              </div>
              <ArrowRight
                className="mt-1 h-4 w-4 shrink-0 text-gold-ink transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
