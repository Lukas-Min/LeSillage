import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Droplet, PackageOpen, SprayCan, Star } from "lucide-react";
import { loadCatalogCards, type CatalogCardModel } from "@/lib/catalog";
import { Price } from "@/components/store/price";
import { Button } from "@/components/ui/button";
import { Eyebrow, SectionCard } from "@/components/ui/section";
import { CompositionCanvas } from "@/components/store/composition-canvas";
import { Skeleton } from "@/components/ui/skeleton";
import { concentrationLabel } from "@/domain/concentration";
import { labelForCategory } from "@/domain/product-type";
import { capitalizeFirst } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SHELVES = [
  {
    title: "Decant",
    subtitle: "Try before the full bottle.",
    href: "/shop?type=DECANT",
    icon: Droplet,
  },
  {
    title: "Full bottle",
    subtitle: "Sealed, ready to ship.",
    href: "/shop?type=FULL_BOTTLE",
    icon: SprayCan,
  },
  {
    title: "Partial",
    subtitle: "Opened once, priced to move.",
    href: "/shop?type=PARTIAL",
    icon: PackageOpen,
  },
] as const;

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="surface-grid border-b border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:py-24">
          <div className="flex flex-col items-center gap-3 text-center">
            <Eyebrow>Est. 2026 · Manila</Eyebrow>
            <h1 className="font-serif-display text-5xl leading-tight sm:text-6xl">Le Sillage</h1>
          </div>
          <Suspense fallback={<FlagshipSkeleton />}>
            <FlagshipPanel />
          </Suspense>
          <p className="mx-auto max-w-xl text-center font-serif-display text-lg italic text-muted-foreground">
            &ldquo;A curated trail of scent, in bottles and decants.&rdquo;
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <header className="mb-10 flex flex-col items-center gap-3 text-center">
          <Eyebrow>The shelf</Eyebrow>
          <h2 className="font-serif-display text-3xl sm:text-4xl">Browse by type</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Decants, partials, and full bottles — pick a shelf to start.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SHELVES.map((shelf) => (
            <TypeTile key={shelf.title} {...shelf} />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <SectionCard
          eyebrow="How it works"
          title="From browsing to bottle, in three steps"
          contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <Step number="01" title="Browse the catalog" body="Use the shop or the shelves above to pick full bottles, partials, and decants." />
          <Step number="02" title="Place your order" body="Sign in, confirm delivery or pickup, and we email your QR codes." />
          <Step number="03" title="Upload payment receipt" body="Stock is reserved the moment your receipt is submitted." />
        </SectionCard>
      </section>
    </main>
  );
}

async function FlagshipPanel() {
  const cards = await loadCatalogCards({ type: "FULL_BOTTLE" });
  const flagship = pickFlagship(cards);
  if (!flagship) return null;
  const concentrationGender = [concentrationLabel(flagship.concentration), flagship.gender ? capitalizeFirst(flagship.gender) : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 items-center gap-8 sm:grid-cols-[1fr_1.2fr]">
      <div className="relative mx-auto w-full max-w-xs">
        {flagship.ratingValue ? (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-none bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-sm">
            <Star className="h-3 w-3 fill-gold text-gold" aria-hidden="true" />
            {flagship.ratingValue.toFixed(1)}
          </span>
        ) : null}
        <span className="absolute left-2 bottom-2 z-10 inline-flex items-center rounded-none bg-background/90 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-foreground shadow-sm backdrop-blur-sm">
          {labelForCategory(flagship.fragranceCategory)}
        </span>
        <CompositionCanvas
          brand={flagship.brand}
          name={flagship.name}
          pyramid={flagship.notePyramid}
          imageUrl={flagship.imageUrl}
          imageAlt={flagship.imageAlt}
          className="transition-transform duration-300 hover:-translate-y-1"
        />
      </div>
      <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{flagship.brand}</p>
        <h2 className="font-serif-display text-3xl leading-tight sm:text-4xl">{flagship.name}</h2>
        {concentrationGender ? <p className="text-sm text-muted-foreground">{concentrationGender}</p> : null}
        {flagship.description ? (
          <p className="text-sm text-muted-foreground sm:text-base">{flagship.description}</p>
        ) : null}
        <Price
          className="pt-1"
          originalCentavos={flagship.minOriginalCentavos}
          discountedCentavos={flagship.minDiscountedCentavos}
        />
        <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row">
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
  return inStock[Math.floor(Math.random() * inStock.length)];
}

function FlagshipSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 items-center gap-8 sm:grid-cols-[1fr_1.2fr]">
      <Skeleton className="mx-auto aspect-square w-full max-w-xs rounded-md" />
      <div className="flex flex-col items-center gap-3 sm:items-start">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-6 w-32" />
        <div className="flex w-full gap-3 pt-2 sm:w-auto">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>
    </div>
  );
}

function TypeTile({
  title,
  subtitle,
  href,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_16px_40px_-24px_rgba(31,28,24,0.35)]"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold-foreground transition-colors group-hover:border-gold">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="font-serif-display text-2xl">{title}</h3>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{subtitle}</p>
      <span className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.28em] text-gold-foreground opacity-80 transition-opacity group-hover:opacity-100">
        View the shelf
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="space-y-2">
      <Eyebrow>{number}</Eyebrow>
      <p className="font-serif-display text-lg leading-tight">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
