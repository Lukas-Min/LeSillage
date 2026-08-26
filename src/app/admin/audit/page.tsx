import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const rows = await db()
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(100);
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">Audit log</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest 100 events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No events yet.</p>
          ) : (
            rows.map((event) => (
              <p key={event.id} className="border-t pt-2 first:border-t-0 first:pt-0">
                <span className="font-medium">{event.action}</span> · {event.targetType} ·{" "}
                {event.targetId ?? "—"} · {event.createdAt.toLocaleString()}
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
