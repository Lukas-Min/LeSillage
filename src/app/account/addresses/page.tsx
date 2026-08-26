import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { addresses } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?returnTo=/account/addresses");
  const rows = await db()
    .select()
    .from(addresses)
    .where(eq(addresses.userId, session.user.id as string))
    .orderBy(desc(addresses.createdAt));
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Saved addresses</h1>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            You have no saved addresses yet.
          </CardContent>
        </Card>
      ) : (
        rows.map((address) => (
          <Card key={address.id}>
            <CardHeader>
              <CardTitle className="text-base">{address.recipientName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{address.phone}</p>
              <p>
                {address.street}, {address.barangay}, {address.city}, {address.province},{" "}
                {address.region} {address.postalCode}
              </p>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/account/profile`}>Edit (coming soon)</Link>
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
