import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Eyebrow } from "@/components/ui/section";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const rows = await db()
    .selectDistinct({ brand: products.brand })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.brand));
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Brands" }]} />
      <header className="space-y-2 text-center">
        <Eyebrow>Le Sillage · Manila</Eyebrow>
        <h1 className="font-serif-display text-4xl">Brands</h1>
      </header>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map((row) => (
          <li key={row.brand}>
            <Link
              href={`/brands/${encodeURIComponent(row.brand)}`}
              className="block rounded-md border border-border px-3 py-3 text-sm hover:border-gold/40 hover:bg-muted/40"
            >
              {row.brand}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
