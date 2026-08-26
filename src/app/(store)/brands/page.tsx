import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const rows = await db()
    .selectDistinct({ brand: products.brand })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.brand));
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
      <h1 className="font-serif-display text-2xl">Brands</h1>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map((row) => (
          <li key={row.brand}>
            <Link
              href={`/brands/${encodeURIComponent(row.brand)}`}
              className="block rounded border px-3 py-2 text-sm hover:bg-secondary"
            >
              {row.brand}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
