import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const shelves = await Promise.all([
    db()
      .select({ id: products.id, name: products.name, brand: products.brand, family: products.family })
      .from(products)
      .where(eq(products.fragranceCategory, "NICHE"))
      .orderBy(asc(products.brand))
      .limit(4),
    db()
      .select({ id: products.id, name: products.name, brand: products.brand, family: products.family })
      .from(products)
      .where(eq(products.fragranceCategory, "DESIGNER"))
      .orderBy(asc(products.brand))
      .limit(4),
    db()
      .select({ id: products.id, name: products.name, brand: products.brand, family: products.family })
      .from(products)
      .where(eq(products.fragranceCategory, "MIDDLE_EASTERN"))
      .orderBy(asc(products.brand))
      .limit(4),
  ]);
  const [niche, designer, me] = shelves;
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-5 py-16 text-center sm:py-24">
        <p className="text-xs uppercase tracking-[0.4em] text-gold">Le Sillage · Manila</p>
        <h1 className="font-serif-display max-w-2xl text-3xl leading-tight sm:text-5xl sm:leading-tight">
          A curated trail of scent, in bottles and decants.
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          Full bottles by pre-order. Partials and decants on hand. Pay via QR, upload your receipt, and we ship.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg">
            <Link href="/shop">Shop the catalog</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/how-to-pay">How to pay</Link>
          </Button>
        </div>
      </section>
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 pb-16 sm:grid-cols-3">
        <Shelf title="Niche" subtitle="Bold, original" items={niche} href="/collections/niche" />
        <Shelf title="Designer" subtitle="House classics" items={designer} href="/collections/designer" />
        <Shelf title="Middle Eastern" subtitle="Oud-led, spicy" items={me} href="/collections/middle-eastern" />
      </section>
      <section className="mx-auto w-full max-w-6xl px-5 pb-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <Step number="1" title="Browse the catalog" body="Use the shelves or collections to pick full bottles, partials, and decants." />
            <Step number="2" title="Place your order" body="Sign in, confirm delivery or pickup, and we email your QR codes." />
            <Step number="3" title="Upload payment receipt" body="Stock is reserved the moment your receipt is submitted." />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Shelf({ title, subtitle, items, href }: { title: string; subtitle: string; items: { id: string; name: string; brand: string }[]; href: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif-display text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No items yet.</p>
        ) : (
          items.map((item) => (
            <p key={item.id}>
              <span className="text-muted-foreground">{item.brand}</span> · {item.name}
            </p>
          ))
        )}
        <Link href={href} className="mt-2 inline-block text-xs underline-offset-4 hover:underline">
          Browse {title.toLowerCase()}
        </Link>
      </CardContent>
    </Card>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-widest text-gold">{number}</p>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
