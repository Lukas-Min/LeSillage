import { desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader } from "@/components/ui/page-layout";
import { formatDate } from "@/lib/utils";

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
    <div className="flex flex-1 flex-col gap-6">
      <AreaHeader eyebrow="Admin" title="Customers" />
      {/* Full width: a list has no secondary cards. flex-1 so an empty
          message centres in the leftover height. */}
      <div className="flex flex-1 flex-col gap-4">
        {rows.length === 0 ? (
          <Card className="flex flex-1 flex-col">
            <CardContent className="flex flex-1 flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
              No customers yet.
            </CardContent>
          </Card>
        ) : (
          rows.map((row) => (
            <Link key={row.id} href={`/admin/customers/${row.id}`} className="block">
              <Card className="transition-colors hover:border-gold/40 hover:bg-muted/30">
                <CardHeader>
                  <CardTitle className="break-words text-base">{row.email}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Name: {row.name ?? "—"}</p>
                  <p>Role: {row.role}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDate(row.createdAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
