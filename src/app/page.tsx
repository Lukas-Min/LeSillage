import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { loadCatalogCards, type CatalogCardModel } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Eyebrow, SectionCard } from "@/components/ui/section";
import { ProductCard } from "@/components/store/product-card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [bottles, decants] = await Promise.all([
    loadCatalogCards({ types: ["FULL_BOTTLE", "PARTIAL"] }),
    loadCatalogCards({ type: "DECANT" }),
  ]);
  return (
    <main className="flex flex-1 flex-col">
      <section className="surface-grid border-b border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
          <Eyebrow>Le Sillage · Manila</Eyebrow>
          <h1 className="font-serif-display max-w-2xl text-3xl leading-tight sm:text-5xl sm:leading-tight">
            Curated perfume, in bottles and decants.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Full bottles by pre-order. Partials and decants on hand. Pay via QR, upload your receipt, and we ship.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild variant="gold" size="lg" className="h-11 rounded-md">
              <Link href="/bottles">
                Shop bottles
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 rounded-md">
              <Link href="/decants">Shop decants</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-12 px-4 py-12">
        <Shelf
          title="Bottles"
          subtitle="Full sizes and partials"
          href="/bottles"
          items={bottles}
        />
        <Shelf
          title="Decants"
          subtitle="3ml to 30ml pours"
          href="/decants"
          items={decants}
        />
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <SectionCard
          eyebrow="How it works"
          title="From browsing to bottle, in three steps"
          contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <Step number="01" title="Browse the catalog" body="Bottles and decants live on separate shelves. Open a fragrance for composition, sizes, and price." />
          <Step number="02" title="Place your order" body="Sign in, confirm delivery or pickup, and we email your QR codes." />
          <Step number="03" title="Upload payment receipt" body="Stock is reserved the moment your receipt is submitted." />
        </SectionCard>
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
    <section className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <Eyebrow>{subtitle}</Eyebrow>
          <h2 className="font-serif-display text-2xl sm:text-3xl">{title}</h2>
        </div>
        <Link href={href} className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground hover:text-foreground">
          See all
        </Link>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {items.slice(0, 3).map((item) => (
          <ProductCard key={item.productId} card={item} />
        ))}
        {items.length === 0 ? (
          <p className="col-span-full rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Nothing on this shelf yet.
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
