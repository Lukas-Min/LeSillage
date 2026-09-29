import Link from "next/link";
import { ArrowRight, BadgePercent, ChevronRight, Droplet, Gift, PackageOpen, SprayCan, Store, Truck, type LucideIcon } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { CatalogCardSkeleton } from "@/components/store/loading";
import { Eyebrow } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { DECANT_SIZES_ML } from "@/domain/decant";
import { formatPHP } from "@/domain/money";
import { siteWideDiscountStatus } from "@/domain/promo";
import type { CatalogCardModel } from "@/lib/catalog";
import { loadPromoConfig } from "@/lib/cart";
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

/** Phones: one full card plus half of the next (16px lead + card + 12px
 *  gap + half a card fills the screen when the card is ~67% of the row), so
 *  the row reads as swipeable without cramming two narrow cards in. Wider
 *  screens fit more, narrower slots. */
const RAIL_ITEM_CLASS =
  "w-[67%] max-w-[18rem] shrink-0 snap-start min-[576px]:w-[40%] md:w-[31%] lg:w-[23.5%] xl:w-[18.8%]";
/** Scrollbar hidden (Firefox + WebKit); rows still scroll by swipe, trackpad,
 *  shift+wheel, and tabbing to a card, and the peeking card shows they scroll.
 *  pt-2/pb-3 leave room for the card's hover lift and shadow: overflow-x
 *  scrolling clips vertically too, which cut off the lifted card's top. */
const RAIL_LIST_CLASS =
  "flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 pt-2 [scrollbar-width:none] min-[576px]:gap-4 [&::-webkit-scrollbar]:hidden";

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
/** Same gold-circle treatment as the Browse-by-type icons. */
const PERK_ICON_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold-ink";
/** An odd last perk spans both phone columns instead of leaving a hole. */
const PERK_ITEM_CLASS =
  "flex items-center gap-3 bg-card p-3 sm:p-4 [&:last-child:nth-child(odd)]:col-span-2 sm:[&:last-child:nth-child(odd)]:col-span-1";

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
          <span className={PERK_ICON_CLASS}>
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{title}</p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{detail}</p>
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
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
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

/** Inset ring for links inside an overflow-hidden panel, where an outside
 *  outline would be clipped. */
const INSET_FOCUS_RING = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-ink";

/**
 * One joined panel: full-width rows on a phone (icon, name and line, chevron
 * — each row a 72px tap target), three columns side by side from sm.
 */
export function ShelfTiles() {
  return (
    <div className="px-4">
      <ul className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-md border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {SHELVES.map(({ title, subtitle, href, icon: Icon }) => (
          <li key={title}>
            <Link
              href={href}
              className={`group flex min-h-[4.5rem] items-center gap-4 px-4 py-3 transition-colors hover:bg-[color-mix(in_oklch,var(--card),var(--gold)_6%)] sm:h-full sm:flex-col sm:items-start sm:gap-3 sm:p-6 ${INSET_FOCUS_RING}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold-ink transition-colors group-hover:border-gold">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif-display text-lg leading-tight sm:text-2xl">{title}</h3>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-gold-ink sm:hidden"
                aria-hidden="true"
              />
              <span className="hidden items-center gap-1 text-xs uppercase tracking-[0.2em] text-gold-ink sm:inline-flex">
                Shop
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const FAMILIES: Array<{ slug: string; title: string; description: string }> = [
  { slug: "middle-eastern", title: "Middle Eastern", description: "Luxurious oud and amber, without the luxury price" },
  { slug: "designer", title: "Designer", description: "The names you know, polished and easy to wear" },
  { slug: "niche", title: "Niche", description: "Independent houses with unexpected compositions" },
];

/** Framed, gold-tinted tiles for the /collections pages: name and a short
 *  line at the bottom, "Explore" in the top-right corner, drawn over the initial
 *  as a large watermark behind it. */
export function ScentFamilies() {
  return (
    <ul className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-3 sm:gap-4">
      {FAMILIES.map(({ slug, title, description }) => (
        <li key={slug}>
          <Link
            href={`/collections/${slug}`}
            className={`group relative flex h-full min-h-40 flex-col justify-end overflow-hidden rounded-md border border-gold/35 bg-[color-mix(in_oklch,var(--card),var(--gold)_10%)] p-5 transition-colors hover:border-gold sm:min-h-56 sm:p-6 ${HOME_FOCUS_RING}`}
          >
            <span className="pointer-events-none absolute inset-2 border border-gold/20" aria-hidden="true" />
            <span
              className="pointer-events-none absolute -top-7 right-4 font-serif-display text-[6.5rem] leading-[0.8] text-gold/15 transition-colors group-hover:text-gold/25 sm:-top-9 sm:right-5 sm:text-[8rem]"
              aria-hidden="true"
            >
              {title.charAt(0)}
            </span>
            <h3 className="relative font-serif-display text-2xl leading-tight sm:text-3xl">{title}</h3>
            <p className="relative mt-1 text-sm text-muted-foreground">{description}</p>
            <span className="absolute right-5 top-5 inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-gold-ink sm:right-6 sm:top-6">
              Explore
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const STEPS = [
  { title: "Browse the catalog", body: "Use the shop or the shelves above to pick full bottles, testers, partials, and decants." },
  { title: "Place your order", body: "Sign in, confirm delivery or pickup, and we email your QR codes." },
  { title: "Upload payment receipt", body: "Stock is reserved the moment your receipt is submitted." },
] as const;

/** Numbered timeline on a phone (gold badges joined by a line), three
 *  cards side by side from sm. An `ol`, so screen readers get the order;
 *  the visible numbers are decorative. */
export function HowItWorksSteps() {
  return (
    <ol className="grid grid-cols-1 px-4 sm:grid-cols-3 sm:gap-4">
      {STEPS.map(({ title, body }, index) => (
        <li
          key={title}
          className="relative flex gap-4 pb-6 last:pb-0 sm:flex-col sm:gap-3 sm:rounded-md sm:border sm:border-border sm:bg-card sm:p-6 sm:last:pb-6"
        >
          {index < STEPS.length - 1 ? (
            <span className="absolute bottom-0 left-5 top-10 w-px bg-gold/35 sm:hidden" aria-hidden="true" />
          ) : null}
          <span
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-[color-mix(in_oklch,var(--cream),var(--gold)_10%)] font-price-display text-sm text-gold-ink"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 pt-1.5 sm:pt-0">
            <h3 className="font-serif-display text-lg leading-tight">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
