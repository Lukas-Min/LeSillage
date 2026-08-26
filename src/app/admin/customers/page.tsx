import { desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const rows = await db()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Customers</h1>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No customers yet.
          </CardContent>
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link href={`/admin/customers/${row.id}`} className="hover:underline">
                  {row.email}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Name: {row.name ?? "—"}</p>
              <p>Role: {row.role}</p>
              <p className="text-xs text-muted-foreground">
                Joined {row.createdAt.toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
