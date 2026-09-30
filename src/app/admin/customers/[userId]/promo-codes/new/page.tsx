import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CustomerPromoCodeForm } from "@/components/admin/customer-promo-code-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader, PAGE_ACTION_CLASS } from "@/components/ui/page-layout";
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
    <div className="space-y-6">
      <AreaHeader
        title="Add promo code"
        subtitle={<span className="break-words">{user.name ?? user.email}</span>}
        actions={
          <Button asChild variant="outline" className={PAGE_ACTION_CLASS}>
            <Link href={`/admin/customers/${user.id}`}>Back</Link>
          </Button>
        }
      />
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
