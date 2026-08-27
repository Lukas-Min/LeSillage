import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { loadCatalogCards, type CatalogCardModel } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Eyebrow, PageHeader, SectionCard, SurfaceCard } from "@/components/ui/section";
import { ProductCard } from "@/components/store/product-card";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS = {
  NICHE: { title: "Niche", subtitle: "Bold, original", href: "/collections/niche" },
  DESIGNER: { title: "Designer", subtitle: "House classics", href: "/collections/designer" },
  MIDDLE_EASTERN: { title: "Middle Eastern", subtitle: "Oud-led, spicy", href: "/collections/middle-eastern" },
} as const;

export default async function Home() {
  const [niche, designer, me] = await Promise.all([
    loadCatalogCards({ fragranceCategory: "NICHE" }),
    loadCatalogCards({ fragranceCategory: "DESIGNER" }),
    loadCatalogCards({ fragranceCategory: "MIDDLE_EASTERN" }),
  ]);
  return (
    <main className="flex flex-1 flex-col">
      <section className="surface-grid border-b border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
          <Eyebrow>Le Sillage · Manila</Eyebrow>
          <h1 className="font-serif-display max-w-2xl text-3xl leading-tight sm:text-5xl sm:leading-tight">
            A curated trail of scent, in bottles and decants.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Full bottles by pre-order. Partials and decants on hand. Pay via QR, upload your receipt, and we ship.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg">
              <Link href="/bottles">
                Shop the catalog
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/how-to-pay">How to pay</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-10 px-4 py-12">
        <PageHeader
          eyebrow="Catalog"
          title="Browse by character"
          subtitle="Three curated shelves. Tap any fragrance for sizes, accords, and pricing."
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {Object.entries(CATEGORY_LABELS).map(([key, meta]) => {
            const items =
              key === "NICHE" ? niche : key === "DESIGNER" ? designer : me;
            return (
              <Shelf
                key={key}
                title={meta.title}
                subtitle={meta.subtitle}
                href={meta.href}
                items={items}
              />
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <SectionCard
          eyebrow="How it works"
          title="From browsing to bottle, in three steps"
          contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <Step number="01" title="Browse the catalog" body="Use the shelves or collections to pick full bottles, partials, and decants." />
          <Step number="02" title="Place your order" body="Sign in, confirm delivery or pickup, and we email your QR codes." />
          <Step number="03" title="Upload payment receipt" body="Stock is reserved the moment your receipt is submitted." />
        </SectionCard>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <SurfaceCard className="flex flex-col items-start gap-3 border-gold/40 bg-gold/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Eyebrow>New here</Eyebrow>
            <p className="font-serif-display text-xl">Create an account in under a minute</p>
            <p className="text-sm text-muted-foreground">
              Save addresses, track orders, and check out faster next time.
            </p>
          </div>
          <Button asChild>
            <Link href="/sign-up">Create account</Link>
          </Button>
        </SurfaceCard>
      </section>
    </main>
  );
}

function Shelf({
  title,
  subtitle,
  href,
  items,
}: {
  title: string;
  subtitle: string;
  href: string;
  items: CatalogCardModel[];
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between gap-3">
        <div>
          <Eyebrow>{subtitle}</Eyebrow>
          <h2 className="font-serif-display text-2xl">{title}</h2>
        </div>
        <Link href={href} className="text-xs uppercase tracking-[0.28em] text-muted-foreground hover:text-gold">
          See all
        </Link>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {items.slice(0, 4).map((item) => (
          <ProductCard key={item.productId} card={item} />
        ))}
        {items.length === 0 ? (
          <p className="col-span-2 rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            No fragrances in this shelf yet.
          </p>
        ) : null}
      </div>
    </section>
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