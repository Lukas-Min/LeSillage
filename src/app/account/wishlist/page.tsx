import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { wishlists, products } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?returnTo=/account/wishlist");
  const rows = await db()
    .select({
      id: wishlists.id,
      productId: products.id,
      name: products.name,
      brand: products.brand,
      family: products.family,
    })
    .from(wishlists)
    .innerJoin(products, eq(products.id, wishlists.productId))
    .where(eq(wishlists.userId, session.user.id as string))
    .orderBy(desc(wishlists.createdAt));
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Wishlist</h1>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nothing saved here yet.
          </CardContent>
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <CardHeader>
              <CardTitle className="text-base">{row.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-xs text-muted-foreground">
                {row.brand} · {row.family ?? "—"}
              </p>
              <Link href={`/collections/${row.family?.toLowerCase() ?? ""}`} className="text-xs underline-offset-4 hover:underline">
                Browse similar
              </Link>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
