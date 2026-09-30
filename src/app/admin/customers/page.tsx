import { desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader, MiniStat, MiniStats, PageColumns } from "@/components/ui/page-layout";
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
  const adminCount = rows.filter((row) => row.role === "ADMIN").length;
  // Newest first, so the first row is the latest sign-up.
  const newest = rows[0];
  return (
    <div className="flex flex-1 flex-col gap-6">
      <AreaHeader eyebrow="Admin" title="Customers" />
      <PageColumns
        side={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <MiniStats>
                <MiniStat label="Customers" value={rows.length} />
                <MiniStat label="Admins" value={adminCount} />
                <MiniStat
                  label="Newest sign-up"
                  value={newest ? formatDate(newest.createdAt) : "—"}
                  className="col-span-2"
                />
              </MiniStats>
            </CardContent>
          </Card>
        }
        main={
          rows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
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
          )
        }
      />
    </div>
  );
}
