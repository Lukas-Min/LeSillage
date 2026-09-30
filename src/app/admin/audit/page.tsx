import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaHeader } from "@/components/ui/page-layout";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const rows = await db()
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(100);
  return (
    <div className="flex flex-1 flex-col gap-6">
      <AreaHeader eyebrow="Admin" title="Audit log" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest 100 events</CardTitle>
        </CardHeader>
        <CardContent
          className={
            rows.length === 0
              ? "flex flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground"
              : "space-y-2 break-words text-sm"
          }
        >
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No events yet.</p>
          ) : (
            rows.map((event) => (
              <p key={event.id} className="border-t pt-2 first:border-t-0 first:pt-0">
                <span className="font-medium">{event.action}</span> · {event.targetType} ·{" "}
                {event.targetId ?? "—"} · {formatDateTime(event.createdAt)}
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
