import { AreaHeader } from "@/components/ui/page-layout";
import { AuditListSkeleton } from "@/components/admin/audit-skeleton";

/** Same layout as the page: header, category tabs, then events grouped by day. */
export default function AdminAuditLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <AreaHeader
        eyebrow="Admin"
        title="Audit log"
        subtitle="Who changed what, newest first. Times are Manila time."
      />
      <AuditListSkeleton />
    </div>
  );
}
