import Link from "next/link";
import { ArrowRight, Droplet, PackageOpen, SprayCan } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow, SectionCard } from "@/components/ui/section";

const SHELVES = [
  { title: "Decant", subtitle: "Try before the full bottle.", href: "/shop?type=DECANT", icon: Droplet },
  { title: "Full bottle", subtitle: "Sealed, ready to ship.", href: "/shop?type=FULL_BOTTLE", icon: SprayCan },
  { title: "Partial", subtitle: "Opened once, priced to move.", href: "/shop?type=PARTIAL", icon: PackageOpen },
] as const;

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="surface-grid border-b border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:py-24">
          <div className="flex flex-col items-center gap-3 text-center">
            <Eyebrow>Est. 2026 · Manila</Eyebrow>
            <h1 className="font-serif-display text-5xl leading-tight sm:text-6xl">Le Sillage</h1>
          </div>
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
            <Link
              key={shelf.title}
              href={shelf.href}
              className="group flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_16px_40px_-24px_rgba(31,28,24,0.35)]"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/35 bg-[color-mix(in_oklch,var(--cream),var(--gold)_8%)] text-gold-foreground transition-colors group-hover:border-gold">
                <shelf.icon className="h-6 w-6" />
              </span>
              <h3 className="font-serif-display text-2xl">{shelf.title}</h3>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{shelf.subtitle}</p>
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.28em] text-gold-foreground opacity-80 transition-opacity group-hover:opacity-100">
                View the shelf
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <SectionCard
          eyebrow="How it works"
          title="From browsing to bottle, in three steps"
          contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div className="space-y-2">
            <Eyebrow>01</Eyebrow>
            <p className="font-serif-display text-lg leading-tight">Browse the catalog</p>
            <p className="text-sm text-muted-foreground">
              Use the shop or the shelves above to pick full bottles, partials, and decants.
            </p>
          </div>
          <div className="space-y-2">
            <Eyebrow>02</Eyebrow>
            <p className="font-serif-display text-lg leading-tight">Place your order</p>
            <p className="text-sm text-muted-foreground">Sign in, confirm delivery or pickup, and we email your QR codes.</p>
          </div>
          <div className="space-y-2">
            <Eyebrow>03</Eyebrow>
            <p className="font-serif-display text-lg leading-tight">Upload payment receipt</p>
            <p className="text-sm text-muted-foreground">Stock is reserved the moment your receipt is submitted.</p>
          </div>
        </SectionCard>
      </section>
    </main>
  );
}
