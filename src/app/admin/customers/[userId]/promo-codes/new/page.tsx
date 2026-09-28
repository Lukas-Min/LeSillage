import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CustomerPromoCodeForm } from "@/components/admin/customer-promo-code-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/client";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function NewCustomerPromoCodePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = (await db().select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, userId)))[0];
  if (!user) return notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-2xl">Add promo code</h1>
          <p className="text-sm text-muted-foreground">{user.name ?? user.email}</p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href={`/admin/customers/${user.id}`}>Back</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New code</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerPromoCodeForm userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
